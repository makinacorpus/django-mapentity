import toGeoJSON from '/static/mapentity/togeojson/togeojson.js';

class FileLoader {
    constructor(map, options = {}) {
        this._map = map;
        this.options = {
            ...options
        };

        this._parsers = {
            'geojson': this._loadGeoJSON.bind(this),
            // 'gpx': this.convertToGeoJSON.bind(this),
            // 'kml': this.convertToGeoJSON.bind(this)
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
            console.log('File read successfully'); // Log successful file read
            this._map.fire('data:loading', { filename: file.name, format: ext });
            const layer = parser(e.target.result, ext);
            console.log('Layer added:', layer); // Log the layer added
            this._map.fire('data:loaded', { layer: layer, filename: file.name, format: ext });
        };
        reader.readAsText(file);
    }

    loadGeoJSON(content) {
        console.log('Loading GeoJSON content'); // Log start of GeoJSON loading
        if (typeof content === 'string') {
            content = JSON.parse(content);
        }
        console.log('Parsed GeoJSON:', content); // Log parsed GeoJSON content

        // Add a single source for all geometries
        this._map.addSource('loaded-data', {
            type: 'geojson',
            data: content
        });

        // Add a layer for each geometry type
        if (content.features) {
            // Add a layer for polygons
            this._map.addLayer({
                'id': 'polygon-layer',
                'type': 'fill',
                'source': 'loaded-data',
                'paint': {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4
                },
                'filter': ['==', '$type', 'Polygon']
            });

            // Add a layer for points
            this._map.addLayer({
                'id': 'point-layer',
                'type': 'circle',
                'source': 'loaded-data',
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            // Add a layer for lines
            this._map.addLayer({
                'id': 'line-layer',
                'type': 'line',
                'source': 'loaded-data',
                'paint': {
                    'line-color': '#B42222',
                    'line-width': 2
                },
                'filter': ['==', '$type', 'LineString']
            });
        }
    }

    convertToGeoJSON(content, format) {
        console.log('Converting to GeoJSON, format:', format); // Log conversion start
        // Format is either 'gpx' or 'kml'
        if (typeof content === 'string') {
            content = (new window.DOMParser()).parseFromString(content, "text/xml");
        }
        const geojson = toGeoJSON[format](content);
        console.log('Converted GeoJSON:', geojson); // Log converted GeoJSON
        return this.loadGeoJSON(geojson);
    }
}
