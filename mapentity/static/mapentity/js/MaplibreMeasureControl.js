class MaplibreMeasureControl {
    constructor() {
        this._map = null;
        this._container = null;
        this._distanceDisplay = new MaplibreMeasureDistanceDisplay();
        this._drawing = false;
        this._geojson = {
            'type': 'FeatureCollection',
            'features': []
        };
        this._linestring = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': []
            }
        };
        this._distanceContainer = null;
    }

    onAdd(map) {
        this._map = map;

        // Créer le conteneur principal
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        // Bouton pour activer/désactiver le mode de mesure
        const button = document.createElement('button');
        button.className = 'measure-control-btn';

        // Ajouter une image au bouton
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/measure-control.svg'; // Remplacez par le chemin de votre icône
        img.alt = 'Measure Tool';
        img.style.width = '25px';
        img.style.height = '25px';
        button.appendChild(img);

        this._container.appendChild(button);

        // Créer le conteneur de distance mais ne pas l'ajouter immédiatement
        this._distanceContainer = this._distanceDisplay.createContainer();
        this._distanceContainer.style.display = 'none'; // Masquer par défaut

        // Ajouter l'événement de clic pour activer/désactiver le mode de mesure
        const onClick = (e) => this._onClick(e); // fonction passe plat pour utiliser la methode _onClick
        const onMouseMove = (e) => this._onMouseMove(e); // fonction passe plat pour utiliser la methode _onMouseMove
        button.onclick = () => {
            console.log(this._drawing);
            this._drawing = !this._drawing;

            if (this._drawing) {
                this._map.getCanvas().style.cursor = 'crosshair';
                this._map.on('click', onClick);
                this._map.on('mousemove', onMouseMove);
                this._distanceContainer.style.display = 'block'; // Afficher le conteneur de distance
                const mapcontainer = document.getElementById(this._map.getContainer().id);
                mapcontainer.appendChild(this._distanceContainer); // Ajouter le conteneur de distance à la carte
            } else {
                this._map.getCanvas().style.cursor = 'pointer'; // à changer
                this._map.off('click', onClick);
                this._map.off('mousemove', onMouseMove);
                console.log(this._map);
                this._finishMeasure();
                this._distanceContainer.style.display = 'none'; // Masquer le conteneur de distance
            }
        };

        // Ajouter les sources et les couches à la carte
        this._map.on('load', () => {
            this._map.addSource('geojson', {
                'type': 'geojson',
                'data': this._geojson
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
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    _onClick(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: ['measure-points']
        });

        // Remove the linestring from the group
        // So we can redraw it based on the points collection
        if (this._geojson.features.length > 1) this._geojson.features.pop();

        // If a feature was clicked, remove it from the map
        if (features.length) {
            const id = features[0].properties.id;
            this._geojson.features = this._geojson.features.filter((point) => {
                return point.properties.id !== id;
            });
        } else {
            const point = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [e.lngLat.lng, e.lngLat.lat]
                },
                'properties': {
                    'id': String(new Date().getTime())
                }
            };

            this._geojson.features.push(point);
        }

        if (this._geojson.features.length > 1) {
            this._linestring.geometry.coordinates = this._geojson.features.map(
                (point) => {
                    return point.geometry.coordinates;
                }
            );

            this._geojson.features.push(this._linestring);

            // Call the distance callback
            const distance = turf.length(this._linestring);
            this._distanceDisplay.updateDistance(distance);
        }

        this._map.getSource('geojson').setData(this._geojson);
    }

    _onMouseMove(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: ['measure-points']
        });
        // UI indicator for clicking/hovering a point on the map
        // this._map.getCanvas().style.cursor = features.length ? 'pointer' : 'crosshair';
    }

    _finishMeasure() {
        this._geojson.features = [];
        this._linestring.geometry.coordinates = [];
        this._map.getSource('geojson').setData(this._geojson);
        this._distanceDisplay.updateDistance(0);
    }
}
