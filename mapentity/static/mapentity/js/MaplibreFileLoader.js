class MaplibreFileLoader {
    constructor(map, options = {}) {
        this._map = map;
        this.options = { ...options };

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
        const ext = file.name.split('.').pop();
        const parser = this._parsers[ext];
        if (!parser) {
            window.alert("Unsupported file type " + file.type + ' (' + ext + ')');
            return;
        }

        const reader = new FileReader();
         reader.onload = (e) => {
            // this._map.fire('data:loading', { filename: file.name, format: ext });
            // const layer = parser(e.target.result, ext);
            // this._map.fire('data:loaded', { layer: layer, filename: file.name, format: ext });
            parser(e.target.result, ext);
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
            // Utiliser les options définies ou valeurs par défaut
            const style = this.options.style || {};
            const color = style.color || '#B42222';
            const fillOpacity = style.fillOpacity ?? 0.7;
            const strokeOpacity = style.opacity ?? 1.0;
            const strokeWidth = style.weight ?? 2;
            const circleRadius = style.radius ?? 6;

            // On envoie un objet `style` complet
            this._addLayerWithPopup('polygon', 'fill', sourceId, {
                color,
                opacity: fillOpacity
            }, ['==', '$type', 'Polygon']);

            this._addLayerWithPopup('point', 'circle', sourceId, {
                color,
                radius: circleRadius
            }, ['==', '$type', 'Point']);

            this._addLayerWithPopup('line', 'line', sourceId, {
                color,
                opacity: strokeOpacity,
                width: strokeWidth
            }, ['==', '$type', 'LineString']);

            const bounds = this.calculateBounds(content);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
            }
        }
    }

    _addLayerWithPopup(type, layerType, sourceId, style, filter) {
        const layerId = `${type}-layer-${sourceId}`;

        // Créer dynamiquement l'objet paint selon le type de layer
        let paint;
        if (layerType === 'fill') {
            paint = {
                'fill-color': style.color,
                'fill-opacity': style.opacity
            };
        } else if (layerType === 'circle') {
            paint = {
                'circle-radius': style.radius,
                'circle-color': style.color
            };
        } else if (layerType === 'line') {
            paint = {
                'line-color': style.color,
                'line-opacity': style.opacity,
                'line-width': style.width
            };
        }

        this._map.addLayer({
            id: layerId,
            type: layerType,
            source: sourceId,
            paint: paint,
            filter: filter
        });

        // Ajouter popup
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
        if (!geojson) return null;

        const bounds = new maplibregl.LngLatBounds();

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

        if (geojson.geometry) {
            flattenCoords(geojson.geometry).forEach(coord => bounds.extend(coord));
        } else if (geojson.features) {
            geojson.features.forEach(feature => {
                if (feature.geometry) {
                    flattenCoords(feature.geometry).forEach(coord => bounds.extend(coord));
                }
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
