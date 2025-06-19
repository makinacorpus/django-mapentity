class MaplibreFileLoader {
    constructor(map, options = {}) {
        this._map = map;
        this.options = {
            ...options
        };

        this._popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        this._parsers = {
            'geojson': this._loadGeoJSON.bind(this),
            'gpx': this._convertToGeoJSON.bind(this),
            'kml': this._convertToGeoJSON.bind(this)
        };
    }

    load(file) {
        console.log('Loading file:', file.name);
        const ext = file.name.split('.').pop();
        console.log('File extension:', ext);
        const parser = this._parsers[ext];
        if (!parser) {
            window.alert("Unsupported file type " + file.type + '(' + ext + ')');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this._map.fire('data:loading', { filename: file.name, format: ext });
            const layer = parser(e.target.result, ext);
            this._map.fire('data:loaded', { layer: layer, filename: file.name, format: ext });
        };
        reader.readAsText(file);
    }

    _loadGeoJSON(content) {
        if (typeof content === 'string') {
            content = JSON.parse(content);
        }

        const sourceId = `source-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        this._map.addSource(sourceId, {
            type: 'geojson',
            data: content
        });

        if (content.features) {
            this._addLayerWithPopup('polygon', 'fill', sourceId, '#888888', 0.4, ['==', '$type', 'Polygon']);
            this._addLayerWithPopup('point', 'circle', sourceId, '#B42222', 6, ['==', '$type', 'Point']);
            this._addLayerWithPopup('line', 'line', sourceId, '#B42222', 2, ['==', '$type', 'LineString']);

            const bounds = this.calculateBounds(content);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
            }
        }
    }

    _addLayerWithPopup(type, layerType, sourceId, color, sizeOrOpacity, filter) {
        const layerId = `${type}-layer-${sourceId}`;

        const paint = {
            'fill': {
                'fill-color': color,
                'fill-opacity': sizeOrOpacity
            },
            'circle': {
                'circle-radius': sizeOrOpacity,
                'circle-color': color
            },
            'line': {
                'line-color': color,
                'line-width': sizeOrOpacity
            }
        };

        this._map.addLayer({
            id: layerId,
            type: layerType,
            source: sourceId,
            paint: paint[layerType],
            filter: filter
        });

        // Add popup events
        this._map.on('mouseenter', layerId, (e) => {
            this._map.getCanvas().style.cursor = 'pointer';
            const coordinates = e.lngLat;
            const properties = e.features[0].properties;
            console.log(properties);
            const content = Object.entries(properties)
                .map(([key, value]) => `<strong>${key}</strong>: ${value}`)
                .join('<br>');

            this._popup.setLngLat(coordinates)
                .setHTML(content || 'Aucune donnée')
                .addTo(this._map);
        });

        this._map.on('mouseleave', layerId, () => {
            this._map.getCanvas().style.cursor = '';
            this._popup.remove();
        });
    }

    calculateBounds(geojson) {
        if (!geojson) {
            return null;
        }

        const bounds = new maplibregl.LngLatBounds();

        // Fonction utilitaire pour extraire et aplatir les coordonnées
        const flattenCoords = (geometry) => {
            const { type, coordinates, geometries } = geometry;
            let flattened = [];

            switch (type) {
                case 'Point':
                    flattened = [coordinates];
                    break;
                case 'MultiPoint':
                case 'LineString':
                    flattened = coordinates;
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    flattened = coordinates.flat();
                    break;
                case 'MultiPolygon':
                    flattened = coordinates.flat(2);
                    break;
                case 'GeometryCollection':
                    geometries?.forEach(geom => {
                        flattened.push(...flattenCoords(geom));
                    });
                    break;
            }

            return flattened;
        };

        // Cas d'un seul Feature
        if (geojson.geometry) {
            const coords = flattenCoords(geojson.geometry);
            coords.forEach(coord => bounds.extend(coord));
        }

        // Cas d'une FeatureCollection
        else if (geojson.features) {
            geojson.features.forEach(feature => {
                const geometry = feature.geometry;
                if (!geometry) return;
                const coords = flattenCoords(geometry);
                coords.forEach(coord => bounds.extend(coord));
            });
        }

        return bounds.isEmpty() ? null : bounds;
    }


    _convertToGeoJSON(content, format) {
        if (typeof content === 'string') {
            content = (new window.DOMParser()).parseFromString(content, "text/xml");
        }
        const geojson = toGeoJSON[format](content);
        return this._loadGeoJSON(geojson);
    }
}
