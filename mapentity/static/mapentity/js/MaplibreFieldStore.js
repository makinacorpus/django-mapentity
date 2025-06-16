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
    }

    _serialize(featureCollection) {
        if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
            return '';
        }

        const features = featureCollection.features;
        return this._serializeByGeomType(features);
    }

    _serializeByGeomType(features) {
        if (features.length === 1 && features[0].geometry) {
            // Géométrie simple
            return JSON.stringify(features[0].geometry);
        }
    }
}