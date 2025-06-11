
class GeometryDataManager {
    constructor(options = {}) {
        this.options = options;
        this.currentData = null;
    }

    // Initialise avec une FeatureCollection vide
    initializeEmpty() {
        this.currentData = GeometryProvider.createEmptyFeatureCollection();
        return this.currentData;
    }

    // Met à jour les données internes
    updateData(featureCollection) {
        this.currentData = featureCollection;
        return this.currentData;
    }

    // Récupère les données actuelles
    getData() {
        return this.currentData;
    }

    // Charge depuis un objet GeoJSON
    loadFromGeoJSON(geoJsonObject) {
        if (!geoJsonObject) {
            return this.initializeEmpty();
        }

        this.currentData = this._normalizeToFeatureCollection(geoJsonObject);
        return this.currentData;
    }

    _normalizeToFeatureCollection(geojson) {
        if (!geojson) {
            return this.initializeEmpty();
        }

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

            case 'MultiPoint':
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coord => ({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'Point', coordinates: coord }
                    }));
                    return { type: 'FeatureCollection', features: features };
                }
                return { type: 'FeatureCollection', features: [feature] };

            case 'MultiLineString':
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coords => ({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: coords }
                    }));
                    return { type: 'FeatureCollection', features: features };
                }
                return { type: 'FeatureCollection', features: [feature] };

            case 'MultiPolygon':
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coords => ({
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'Polygon', coordinates: coords }
                    }));
                    return { type: 'FeatureCollection', features: features };
                }
                return { type: 'FeatureCollection', features: [feature] };

            default:
                return { type: 'FeatureCollection', features: [feature] };
        }
    }
}
