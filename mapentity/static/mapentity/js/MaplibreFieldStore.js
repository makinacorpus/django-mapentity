// Store pour gérer la sérialisation/désérialisation des données géométriques
class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        this.formField = document.getElementById(fieldId);
        this.options = { ...options };
    }

    load() {
        const value = this.formField.value || '';
        return this._deserialize(value);
    }

    save(geojsonData) {
        this.formField.value = this._serialize(geojsonData);
    }

    _serialize(geojsonData) {
        if (!geojsonData || (Array.isArray(geojsonData) && geojsonData.length === 0)) {
            return '';
        }

        let features = [];

        // Si on a un tableau de features
        if (Array.isArray(geojsonData)) {
            features = geojsonData;
        } else if (geojsonData.type === 'FeatureCollection') {
            features = geojsonData.features;
        } else if (geojsonData.type === 'Feature') {
            features = [geojsonData];
        }

        if (features.length === 0) {
            return '';
        }

        // Gérer la sérialisation selon le type de géométrie attendu
        return this._serializeByGeomType(features);
    }

    _serializeByGeomType(features) {
        const isMulti = this.options.isCollection || features.length > 1;
        const isGeneric = this.options.isGeneric;
        const geomType = this.options.geomType?.toUpperCase();

        if (features.length === 1 && !isMulti) {
            // Géométrie simple
            return JSON.stringify(features[0].geometry);
        }

        if (isGeneric && isMulti) {
            // GeometryCollection générique
            const geometries = features.map(f => f.geometry);
            return JSON.stringify({
                type: 'GeometryCollection',
                geometries: geometries
            });
        }

        // Gérer les Multi* spécifiques
        switch (geomType) {
            case 'MULTIPOINT':
                const coordinates = features.map(f => f.geometry.coordinates);
                return JSON.stringify({
                    type: 'MultiPoint',
                    coordinates: coordinates
                });

            case 'MULTILINESTRING':
                const lineCoords = features.map(f => f.geometry.coordinates);
                return JSON.stringify({
                    type: 'MultiLineString',
                    coordinates: lineCoords
                });

            case 'MULTIPOLYGON':
                const polygonCoords = features.map(f => f.geometry.coordinates);
                return JSON.stringify({
                    type: 'MultiPolygon',
                    coordinates: polygonCoords
                });

            default:
                // Fallback vers FeatureCollection ou première géométrie
                if (isMulti) {
                    return JSON.stringify({
                        type: 'FeatureCollection',
                        features: features
                    });
                }
                return JSON.stringify(features[0].geometry);
        }
    }

    _deserialize(value) {
        if (/^\s*$/.test(value)) {
            return null;
        }
        try {
            return this._geoJSONToLayer(JSON.parse(value));
        } catch (error) {
            console.error('Error parsing GeoJSON:', error);
            return null;
        }
    }

    _geoJSONToLayer(geojson) {
        if (!geojson) return null;

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

        // Si c'est une géométrie brute, gérer tous les types
        if (geojson.type && geojson.coordinates) {
            return this._handleGeometryType(geojson);
        }

        // GeometryCollection - convertir chaque géométrie
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

        return null;
    }

    _handleGeometryType(geometry) {
        const feature = {
            type: 'Feature',
            properties: {},
            geometry: geometry
        };

        // Pour les Multi* geometries, on peut les décomposer si nécessaire
        switch (geometry.type) {
            case 'Point':
            case 'LineString':
            case 'Polygon':
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };

            case 'MultiPoint':
                // Décomposer en Points individuels si isCollection est false
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coord => ({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        }
                    }));
                    return {
                        type: 'FeatureCollection',
                        features: features
                    };
                }
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };

            case 'MultiLineString':
                // Décomposer en LineString individuels si isCollection est false
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coords => ({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: coords
                        }
                    }));
                    return {
                        type: 'FeatureCollection',
                        features: features
                    };
                }
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };

            case 'MultiPolygon':
                // Décomposer en Polygon individuels si isCollection est false
                if (!this.options.isCollection) {
                    const features = geometry.coordinates.map(coords => ({
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: coords
                        }
                    }));
                    return {
                        type: 'FeatureCollection',
                        features: features
                    };
                }
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };

            default:
                return {
                    type: 'FeatureCollection',
                    features: [feature]
                };
        }
    }
}



