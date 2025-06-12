
class GeometryDataManager {
    constructor() {
    }

    // Initialise avec une FeatureCollection vide
    initializeEmpty() {
        return {
            type: 'FeatureCollection',
            features: [],
        };
    }

    _normalizeToFeatureCollection(geojson) {

        // Si c'est déjà une FeatureCollection
        if (geojson.type === 'FeatureCollection') {
            return geojson;
        }

        // Si c'est une Feature
        if (geojson.type === 'Feature') {
            return {
                type: 'FeatureCollection',
                features: [geojson]
            };
        }

        // Si c'est une géométrie brute
        if (geojson.type && geojson.coordinates) {
            return this._handleGeometryType(geojson);
        }

        // GeometryCollection
        if (geojson.type === 'GeometryCollection') {
            const features = geojson.geometries.map(geometry => ({
                type: 'Feature',
                properties: {},
                geometry: geometry
            }));
            return {
                type: 'FeatureCollection',
                features: features
            };
        }

        return this.initializeEmpty();
    }

    _handleGeometryType(geometry) {
        const feature = {
            type: 'Feature',
            properties: {},
            geometry: geometry
        };

        // Pour les Multi* geometries, décomposer si nécessaire
        switch (geometry.type) {
            case 'Point':
            case 'LineString':
            case 'Polygon':
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };
            default:
                return { type: 'FeatureCollection', features: [feature] };
        }
    }
}
