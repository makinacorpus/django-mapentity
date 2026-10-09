class GeometryDataManager {
    constructor() {
    }

    /**
     * Init an empty GeoJSON object of type FeatureCollection.
     * @returns {{type: string, features: *[]}} - an empty GeoJSON FeatureCollection
     */
    initializeEmpty() {
        return {
            type: 'FeatureCollection',
            features: [],
        };
    }

    /**
     * Normalise a GeoJSON object to a FeatureCollection.
     * @param geojson {Object} - The GeoJSON object to normalise.
     * @returns {*|{type: string, features: *[]}} - Returns a GeoJSON object of type FeatureCollection
     */
    normalizeToFeatureCollection(geojson) {
        if (!geojson) {
            return this.initializeEmpty();
        }

        // If it's already a FeatureCollection
        if (geojson.type === 'FeatureCollection') {
            return geojson;
        }

        // If it's a Feature
        if (geojson.type === 'Feature') {
            return {
                type: 'FeatureCollection',
                features: [geojson]
            };
        }

        // If it's a GeometryCollection, convert to FeatureCollection
        if (geojson.type === 'GeometryCollection' && Array.isArray(geojson.geometries)) {
            return {
                type: 'FeatureCollection',
                features: geojson.geometries
                    .filter(g => !!g)
                    .flatMap(g => {
                        // Recursively normalize nested geometries
                        const subResult = this.normalizeToFeatureCollection(g);
                        return subResult.features;
                    })
            };
        }

        // If it's a MultiPoint/MultiLineString/MultiPolygon, explode into simple features
        // so that Geoman can edit them individually
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

        // If it's a single geometry (Point/LineString/Polygon), wrap it in a Feature
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
     * Normalise an array of geometries to a GeometryCollection.
     * @param geometries {Array} - An array of geometries to normalise.
     * @returns {{type: string, geometries: *}|{type: string, geometries: *[]}} - Returns a GeoJSON object of type GeometryCollection
     */
    normalizeToGeometryCollection(geometries) {
        return {
            type: 'GeometryCollection',
            geometries: geometries || []
        };

    }

    /**
     * Normalise an array of geometries to a MultiPoint.
     * @param geometries {Array} - An array of Point geometries to normalise.
     * @returns {{type: string, coordinates: Array}} - A GeoJSON object of type MultiPoint
     */
    normalizeToMultiPoint(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiPoint') {
                // If it's already a MultiPoint, add each point individually
                coordinates.push(...g.coordinates);
            } else if (g.type === 'Point') {
                // For a Point, g.coordinates is [lng, lat]
                let pointCoords = g.coordinates;
                
                // Check if the coordinates have an extra nesting level
                // A valid Point has: coordinates = [lng, lat] (two numbers)
                // If coordinates[0] is an array (instead of a number), there is an extra level
                if (Array.isArray(pointCoords) && Array.isArray(pointCoords[0])) {
                    // Extra nesting level detected, unwrap it
                    console.warn('GeometryDataManager: detected extra nesting level in Point coordinates, unwrapping');
                    pointCoords = pointCoords[0];
                }
                
                coordinates.push(pointCoords);
            } else {
                // Fallback: assume it's point coordinates
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiPoint',
            coordinates: coordinates
        };
    }

    /**
     * Normalise an array of geometries to a MultiLineString.
     * @param geometries {Array} - An array of LineString geometries to normalise.
     * @returns {{type: string, coordinates: Array}} - A GeoJSON object of type MultiLineString
     */
    normalizeToMultiLineString(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiLineString') {
                // If it's already a MultiLineString, add each line individually
                coordinates.push(...g.coordinates);
            } else if (g.type === 'LineString') {
                // For a LineString, g.coordinates is [[lng, lat], ...]
                let lineCoords = g.coordinates;
                
                // Check if the coordinates have an extra nesting level
                // A valid LineString has: coordinates[0] = [lng, lat] (a point)
                // If coordinates[0][0] is an array (instead of a number), there is an extra level
                if (Array.isArray(lineCoords) && 
                    Array.isArray(lineCoords[0]) && 
                    Array.isArray(lineCoords[0][0])) {
                    // Extra nesting level detected, unwrap it
                    console.warn('GeometryDataManager: detected extra nesting level in LineString coordinates, unwrapping');
                    lineCoords = lineCoords[0];
                }
                
                coordinates.push(lineCoords);
            } else {
                // Fallback: assume it's LineString coordinates
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiLineString',
            coordinates: coordinates
        };
    }

    /**
     * Normalise an array of geometries to a MultiPolygon.
     * @param geometries {Array} - An array of Polygon geometries to normalise.
     * @returns {{type: string, coordinates: Array}} - A GeoJSON object of type MultiPolygon
     */
    normalizeToMultiPolygon(geometries) {
        const coordinates = [];
        for (const g of geometries) {
            if (!g || !g.coordinates) continue;
            
            if (g.type === 'MultiPolygon') {
                // If it's already a MultiPolygon, add each polygon individually
                coordinates.push(...g.coordinates);
            } else if (g.type === 'Polygon') {
                // For a Polygon, g.coordinates is already in the correct format [ring1, ring2, ...]
                // where ring is an array of points [[lng, lat], ...]
                let polygonCoords = g.coordinates;
                
                // Check if the coordinates have an extra nesting level
                // A valid Polygon has: coordinates[0] = ring = [[lng, lat], ...]
                // If coordinates[0][0][0] is an array (instead of a number), there is an extra level
                if (Array.isArray(polygonCoords) && 
                    Array.isArray(polygonCoords[0]) && 
                    Array.isArray(polygonCoords[0][0]) && 
                    Array.isArray(polygonCoords[0][0][0])) {
                    // Extra nesting level detected, unwrap it
                    console.warn('GeometryDataManager: detected extra nesting level in Polygon coordinates, unwrapping');
                    polygonCoords = polygonCoords[0];
                }
                
                coordinates.push(polygonCoords);
            } else {
                // Fallback: assume it's Polygon coordinates
                coordinates.push(g.coordinates);
            }
        }
        return {
            type: 'MultiPolygon',
            coordinates: coordinates
        };
    }
}