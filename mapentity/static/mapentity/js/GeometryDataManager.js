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

        // Si c'est une GeometryCollection, convertir en FeatureCollection
        if (geojson.type === 'GeometryCollection' && Array.isArray(geojson.geometries)) {
            return {
                type: 'FeatureCollection',
                features: geojson.geometries
                    .filter(g => !!g)
                    .flatMap(g => {
                        // Récursivement normaliser les géométries imbriquées
                        const subResult = this.normalizeToFeatureCollection(g);
                        return subResult.features;
                    })
            };
        }

        // Si c'est un MultiPoint/MultiLineString/MultiPolygon, on explose en features simples
        // pour que Geoman puisse les éditer individuellement
        if (geojson.type === 'MultiPoint' || geojson.type === 'MultiLineString' || geojson.type === 'MultiPolygon') {
             const typeMap = {
                 'MultiPoint': 'Point',
                 'MultiLineString': 'LineString',
                 'MultiPolygon': 'Polygon'
             };
             const simpleType = typeMap[geojson.type];
             
             if (geojson.coordinates && Array.isArray(geojson.coordinates)) {
                 return {
                     type: 'FeatureCollection',
                     features: geojson.coordinates.map(coords => ({
                         type: 'Feature',
                         geometry: {
                             type: simpleType,
                             coordinates: coords
                         },
                         properties: {}
                     }))
                 };
             }
        }

        // Si c'est une géométrie seule (Point/LineString/Polygon), l'encapsuler dans une Feature
        if (geojson.type && geojson.coordinates) {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: geojson,
                    properties: {}
                }]
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

    /**
     * Normalise un tableau de géométries en MultiPoint.
     */
    normalizeToMultiPoint(geometries) {
        return {
            type: 'MultiPoint',
            coordinates: geometries.map(g => g.coordinates)
        };
    }

    /**
     * Normalise un tableau de géométries en MultiLineString.
     */
    normalizeToMultiLineString(geometries) {
        return {
            type: 'MultiLineString',
            coordinates: geometries.map(g => g.coordinates)
        };
    }

    /**
     * Normalise un tableau de géométries en MultiPolygon.
     */
    normalizeToMultiPolygon(geometries) {
        return {
            type: 'MultiPolygon',
            coordinates: geometries.map(g => g.coordinates)
        };
    }
}