
class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        console.log('MaplibreFieldStore initialized with fieldId:', fieldId, 'and options:', options);
        this.formField = document.getElementById(fieldId);
        console.log('Form field found:', this.formField);
        this.options = { ...options };
    }

    // Sauvegarde les données dans le champ du formulaire
    save(featureCollection) {
        console.log('Saving featureCollection to form field:', featureCollection);
        console.log('Form field:', this.formField);
        if (!this.formField) return;

        const serializedData = this._serialize(featureCollection);
        this.formField.value = serializedData;
        console.log('form field value set to:', serializedData);
    }

    _serialize(featureCollection) {
        console.log('Serializing featureCollection:', featureCollection);
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