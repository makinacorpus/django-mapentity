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
     * @param geometries {Array} - Un tableau de géométries Point à normaliser.
     * @returns {{type: string, coordinates: Array}} - Un objet GeoJSON de type MultiPoint
     */
    normalizeToMultiPoint(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiPoint') {
                // Si c'est déjà un MultiPoint, on ajoute chaque point individuellement
                coordinates.push(...g.coordinates);
            } else if (g.type === 'Point') {
                // Pour un Point, g.coordinates est [lng, lat]
                let pointCoords = g.coordinates;
                
                // Vérifier si les coordonnées ont un niveau d'imbrication supplémentaire
                // Un Point valide a: coordinates = [lng, lat] (deux nombres)
                // Si coordinates[0] est un tableau (au lieu d'un nombre), il y a un niveau de trop
                if (Array.isArray(pointCoords) && Array.isArray(pointCoords[0])) {
                    // Niveau d'imbrication supplémentaire détecté, on le retire
                    console.warn('GeometryDataManager: detected extra nesting level in Point coordinates, unwrapping');
                    pointCoords = pointCoords[0];
                }
                
                coordinates.push(pointCoords);
            } else {
                // Fallback : on suppose que c'est des coordonnées de point
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiPoint',
            coordinates: coordinates
        };
    }

    /**
     * Normalise un tableau de géométries en MultiLineString.
     * @param geometries {Array} - Un tableau de géométries LineString à normaliser.
     * @returns {{type: string, coordinates: Array}} - Un objet GeoJSON de type MultiLineString
     */
    normalizeToMultiLineString(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiLineString') {
                // Si c'est déjà un MultiLineString, on ajoute chaque ligne individuellement
                coordinates.push(...g.coordinates);
            } else if (g.type === 'LineString') {
                // Pour un LineString, g.coordinates est [[lng, lat], ...]
                let lineCoords = g.coordinates;
                
                // Vérifier si les coordonnées ont un niveau d'imbrication supplémentaire
                // Un LineString valide a: coordinates[0] = [lng, lat] (un point)
                // Si coordinates[0][0] est un tableau (au lieu d'un nombre), il y a un niveau de trop
                if (Array.isArray(lineCoords) && 
                    Array.isArray(lineCoords[0]) && 
                    Array.isArray(lineCoords[0][0])) {
                    // Niveau d'imbrication supplémentaire détecté, on le retire
                    console.warn('GeometryDataManager: detected extra nesting level in LineString coordinates, unwrapping');
                    lineCoords = lineCoords[0];
                }
                
                coordinates.push(lineCoords);
            } else {
                // Fallback : on suppose que c'est des coordonnées de linestring
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiLineString',
            coordinates: coordinates
        };
    }

    /**
     * Normalise un tableau de géométries en MultiPolygon.
     * @param geometries {Array} - Un tableau de géométries Polygon à normaliser.
     * @returns {{type: string, coordinates: Array}} - Un objet GeoJSON de type MultiPolygon
     */
    normalizeToMultiPolygon(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiPolygon') {
                // Si c'est déjà un MultiPolygon, on ajoute chaque polygone individuellement
                coordinates.push(...g.coordinates);
            } else if (g.type === 'Polygon') {
                // Pour un Polygon, g.coordinates est déjà au bon format [ring1, ring2, ...]
                // où ring est un tableau de points [[lng, lat], ...]
                let polygonCoords = g.coordinates;
                
                // Vérifier si les coordonnées ont un niveau d'imbrication supplémentaire
                // Un polygon valide a: coordinates[0] = ring = [[lng, lat], ...]
                // Si coordinates[0][0][0] est un tableau (au lieu d'un nombre), il y a un niveau de trop
                if (Array.isArray(polygonCoords) && 
                    Array.isArray(polygonCoords[0]) && 
                    Array.isArray(polygonCoords[0][0]) && 
                    Array.isArray(polygonCoords[0][0][0])) {
                    // Niveau d'imbrication supplémentaire détecté, on le retire
                    console.warn('GeometryDataManager: detected extra nesting level in Polygon coordinates, unwrapping');
                    polygonCoords = polygonCoords[0];
                }
                
                coordinates.push(polygonCoords);
            } else {
                // Fallback : on suppose que c'est des coordonnées de polygon
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiPolygon',
            coordinates: coordinates
        };
    }
}