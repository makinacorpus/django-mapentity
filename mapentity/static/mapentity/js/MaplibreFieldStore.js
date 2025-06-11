
class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        this.formField = document.getElementById(fieldId);
        this.options = { ...options };
    }

    // Sauvegarde les données dans le champ du formulaire
    save(featureCollection) {
        if (!this.formField) return;

        const serializedData = this._serialize(featureCollection);
        this.formField.value = serializedData;

        // Déclencher un événement pour notifier le changement
        this.formField.dispatchEvent(new Event('change'));
    }

    // Charge depuis le champ du formulaire
    load() {
        if (!this.formField) {
            return null;
        }

        const value = this.formField.value;
        if (!value || /^\s*$/.test(value)) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error('Error parsing GeoJSON from field:', error);
            return null;
        }
    }

    _serialize(featureCollection) {
        if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
            return '';
        }

        const features = featureCollection.features;
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
                // Fallback vers FeatureCollection
                if (isMulti) {
                    return JSON.stringify({
                        type: 'FeatureCollection',
                        features: features
                    });
                }
                return JSON.stringify(features[0].geometry);
        }
    }
}