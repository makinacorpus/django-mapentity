class GeometryDataManager {
    constructor() {
    }

    /**
     * Initialise un objet GeoJSON vide de type FeatureCollection.
     * @returns {{type: string, features: *[]}} - Un objet GeoJSON vide de type FeatureCollection
     */
    initializeEmpty() {
        return {
            type: 'FeatureCollection',
            features: [],
        };
    }

    /**
     * Normalise un objet GeoJSON en FeatureCollection.
     * @param geojson {Object} - L'objet GeoJSON à normaliser.
     * @returns {*|{type: string, features: *[]}} - Retourne un objet GeoJSON de type FeatureCollection
     */
    normalizeToFeatureCollection(geojson) {
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

        return this.initializeEmpty();
    }

    /**
     * Normalise un tableau de géométries en GeometryCollection.
     * @param geometries {Array} - Un tableau de géométries à normaliser.
     * @returns {{type: string, geometries: *}|{type: string, geometries: *[]}} - Retourne un objet GeoJSON de type GeometryCollection
     */
    normalizeToGeometryCollection(geometries) {
        return {
            type: 'GeometryCollection',
            geometries: geometries || []
        };

    }
}