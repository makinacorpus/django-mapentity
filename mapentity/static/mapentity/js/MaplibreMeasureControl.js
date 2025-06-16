class MaplibreMeasureControl {
    constructor() {
        this._map = null;
        this._container = null;
        this._distanceDisplay = new MaplibreMeasureDistanceDisplay();
        this._drawing = false;
        this._geojson = {
            type: 'FeatureCollection',
            features: []
        };
        this._linestring = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: []
            }
        };
        this._distanceContainer = null;
        this._button = null;
    }

    onAdd(map) {
        this._map = map;

        // Création du conteneur
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        // Création du bouton
        this._button = document.createElement('button');
        this._button.setAttribute('type', 'button');
        this._button.setAttribute('title', 'Mesurer une distance');
        this._button.className = 'measure-control-btn';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/regle.png';
        img.alt = 'Measure Tool';
        img.style.width = '25px';
        img.style.height = '25px';
        this._button.appendChild(img);

        this._container.appendChild(this._button);

        // Container pour la distance
        this._distanceContainer = this._distanceDisplay.createContainer();
        this._distanceContainer.style.display = 'none';

        const onClick = (e) => this._onClick(e);
        const onMouseMove = (e) => this._onMouseMove(e);

        // Toggle dessin
        this._button.onclick = () => {
            this._drawing = !this._drawing;

            if (this._drawing) {
                this._map.getCanvas().style.cursor = 'crosshair';
                this._map.on('click', onClick);
                this._map.on('mousemove', onMouseMove);
                this._distanceContainer.style.display = 'block';

                const mapContainer = document.getElementById(this._map.getContainer().id);
                mapContainer.appendChild(this._distanceContainer);

                // Active le style visuel
                this._button.classList.add('measure-control-btn-active');
            } else {
                this._map.getCanvas().style.cursor = '';
                this._map.off('click', onClick);
                this._map.off('mousemove', onMouseMove);
                this._finishMeasure();
                this._distanceContainer.style.display = 'none';

                //  Retire le style actif
                this._button.classList.remove('measure-control-btn-active');
            }
        };

        this._map.on('load', () => {
            this._map.addSource('geojson', {
                type: 'geojson',
                data: this._geojson
            });

            this._map.addLayer({
                id: 'measure-points',
                type: 'circle',
                source: 'geojson',
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#000'
                },
                filter: ['in', '$type', 'Point']
            });

            this._map.addLayer({
                id: 'measure-lines',
                type: 'line',
                source: 'geojson',
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': '#000',
                    'line-width': 2.5
                },
                filter: ['in', '$type', 'LineString']
            });
        });

        return this._container;
    }

    onRemove() {
        if (this._container?.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._map = undefined;
    }

    _onClick(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: ['measure-points']
        });

        if (this._geojson.features.length > 1) {
            this._geojson.features.pop();
        }

        if (features.length) {
            const id = features[0].properties.id;
            this._geojson.features = this._geojson.features.filter(
                (point) => point.properties.id !== id
            );
        } else {
            const point = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [e.lngLat.lng, e.lngLat.lat]
                },
                properties: {
                    id: String(Date.now())
                }
            };
            this._geojson.features.push(point);
        }

        if (this._geojson.features.length > 1) {
            this._linestring.geometry.coordinates = this._geojson.features.map(
                (point) => point.geometry.coordinates
            );
            this._geojson.features.push(this._linestring);

            const distance = turf.length(this._linestring);
            this._distanceDisplay.updateDistance(distance);
        }

        this._map.getSource('geojson').setData(this._geojson);
    }

    _onMouseMove(e) {
        if (this._drawing) {
            this._map.getCanvas().style.cursor = 'crosshair';
        }
    }

    _finishMeasure() {
        this._geojson.features = [];
        this._linestring.geometry.coordinates = [];
        this._map.getSource('geojson').setData(this._geojson);
        this._distanceDisplay.updateDistance(0);
    }
}
