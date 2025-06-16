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

    normalizeToFeatureCollection(geojson) {
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

    normalizeToGeometryCollection(geometries) {
        if (!geometries || geometries.length === 0) {
            return {
                type: 'GeometryCollection',
                geometries: []
            };
        }

        const normalizedGeometries = geometries.map(geometry => {
            return geometry;
        });

        return {
            type: 'GeometryCollection',
            geometries: normalizedGeometries
        };

    }
}