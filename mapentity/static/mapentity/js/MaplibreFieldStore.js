class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        this.formField = document.getElementById(fieldId);
        this.options = { ...options };
    }

    // Sauvegarde les données dans le champ du formulaire
    save(data) {
        if (!this.formField) {
            return;
        }

        let serializedData = '';
        if(this.options.isGeneric){
            serializedData = this._serializeGeometryCollection(data);
            console.log('Saving generic data generic:', serializedData);
        } else {
            serializedData = this._serialize(data);
            console.log('Saving specific data:', serializedData);
        }

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

    _serializeGeometryCollection(geoemtriesCollection) {
        // Sérialisation en GeometryCollection
        console.log('Serializing GeometryCollection:', geoemtriesCollection);
        return JSON.stringify(geoemtriesCollection);
    }
}