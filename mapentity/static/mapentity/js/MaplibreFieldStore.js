class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        this.formField = document.getElementById(fieldId);
        this.options = { ...options };
    }

    /**
     * Sauvegarde les données dans le champ du formulaire.
     * @param data - Les données à sauvegarder, qui peuvent être une collection de géométries ou un objet GeoJSON.
     */
    save(data) {
        if (!this.formField) {
            return;
        }

        const serializedData = this.options.isGeneric
            ? this._serializeGeometryCollection(data)
            : this._serialize(data)

        this.formField.value = serializedData;
    }

    /**
     * Sérialise un objet GeoJSON de type FeatureCollection ou GeometryCollection en chaîne JSON.
     * @param featureCollection {Object} - L'objet GeoJSON à sérialiser, qui doit être de type FeatureCollection.
     * @returns {string} - La chaîne JSON représentant l'objet GeoJSON.
     * @private
     */
    _serialize(featureCollection) {
        if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
            return '';
        }

        const features = featureCollection.features;
        return this._serializeByGeomType(features);
    }

    /**
     * Sérialise les géométries en fonction de leur type.
     * @param features {Array} - Un tableau de géométries à sérialiser.
     * @returns {string} - La chaîne JSON représentant les géométries.
     * @private
     */
    _serializeByGeomType(features) {
        if (features.length === 1 && features[0].geometry) {
            return JSON.stringify(features[0].geometry);
        }
    }

    /**
     * Sérialise une collection de géométries en GeometryCollection.
     * @param geoemtriesCollection {Object} - Un objet GeoJSON de type GeometryCollection à sérialiser.
     * @returns {string} - La chaîne JSON représentant la GeometryCollection.
     * @private
     */
    _serializeGeometryCollection(geoemtriesCollection) {
        return JSON.stringify(geoemtriesCollection);
    }
}