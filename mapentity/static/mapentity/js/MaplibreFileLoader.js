class MaplibreFileLoader {
    constructor(map, options = {}) {
        this._map = map;
        this.options = {
            ...options
        };

        this._parsers = {
            'geojson': this._loadGeoJSON.bind(this),
            'gpx': this._convertToGeoJSON.bind(this),
            'kml': this._convertToGeoJSON.bind(this)
        };
    }

    load(file) {
        console.log('Loading file:', file.name); // Log the file being loaded
        // Check file extension
        const ext = file.name.split('.').pop();
        console.log('File extension:', ext); // Log the file extension
        const parser = this._parsers[ext];
        if (!parser) {
            window.alert("Unsupported file type " + file.type + '(' + ext + ')');
            return;
        }

        // Read selected file using HTML5 File API
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

        // Generate a unique source ID
        const sourceId = `source-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Add a single source for all geometries
        this._map.addSource(sourceId, {
            type: 'geojson',
            data: content
        });

        // Add a layer for each geometry type
        if (content.features) {
            // Add a layer for polygons
            this._map.addLayer({
                'id': `polygon-layer-${sourceId}`,
                'type': 'fill',
                'source': sourceId,
                'paint': {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4
                },
                'filter': ['==', '$type', 'Polygon']
            });

            // Add a layer for points
            this._map.addLayer({
                'id': `point-layer-${sourceId}`,
                'type': 'circle',
                'source': sourceId,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            // Add a layer for lines
            this._map.addLayer({
                'id': `line-layer-${sourceId}`,
                'type': 'line',
                'source': sourceId,
                'paint': {
                    'line-color': '#B42222',
                    'line-width': 2
                },
                'filter': ['==', '$type', 'LineString']
            });

            // Calculate bounds and fit map to bounds
            const bounds = this.calculateBounds(content);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 50 });
            }
        }
    }

    calculateBounds(geojson) {
        if (!geojson || !geojson.features) {
            return null;
        }

        let bounds = [[Infinity, Infinity], [-Infinity, -Infinity]];

        geojson.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                if (feature.geometry.type === 'Polygon') {
                    coords.forEach(ring => {
                        ring.forEach(coord => {
                            bounds[0][0] = Math.min(bounds[0][0], coord[0]);
                            bounds[0][1] = Math.min(bounds[0][1], coord[1]);
                            bounds[1][0] = Math.max(bounds[1][0], coord[0]);
                            bounds[1][1] = Math.max(bounds[1][1], coord[1]);
                        });
                    });
                } else if (feature.geometry.type === 'Point') {
                    bounds[0][0] = Math.min(bounds[0][0], coords[0]);
                    bounds[0][1] = Math.min(bounds[0][1], coords[1]);
                    bounds[1][0] = Math.max(bounds[1][0], coords[0]);
                    bounds[1][1] = Math.max(bounds[1][1], coords[1]);
                } else if (feature.geometry.type === 'LineString') {
                    coords.forEach(coord => {
                        bounds[0][0] = Math.min(bounds[0][0], coord[0]);
                        bounds[0][1] = Math.min(bounds[0][1], coord[1]);
                        bounds[1][0] = Math.max(bounds[1][0], coord[0]);
                        bounds[1][1] = Math.max(bounds[1][1], coord[1]);
                    });
                }
            }
        });

        return bounds;
    }

    _convertToGeoJSON(content, format) {
        // Format is either 'gpx' or 'kml'
        if (typeof content === 'string') {
            content = (new window.DOMParser()).parseFromString(content, "text/xml");
        }
        const geojson = toGeoJSON[format](content);
        return this._loadGeoJSON(geojson);
    }
}
