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
            this.formField = document.getElementById(this.fieldId);
            if (!this.formField) {
                console.warn('MaplibreFieldStore: formField not found for id', this.fieldId);
                return;
            }
        }

        const serializedData = (this.options.isGeneric || this.options.isCollection)
            ? this._serializeGeometryCollection(data)
            : this._serialize(data)

        console.log('MaplibreFieldStore: saving to', this.formField.id, 'value:', serializedData);
        this.formField.value = serializedData;
        
        // Notification pour les validateurs et autres scripts
        const event = new Event('change', { bubbles: true });
        this.formField.dispatchEvent(event);
        
        if (window.jQuery) {
            window.jQuery(this.formField).trigger('change');
        }

        // On déclenche aussi l'input pour être sûr
        const inputEvent = new Event('input', { bubbles: true });
        this.formField.dispatchEvent(inputEvent);

        // Ajout d'une synchronisation forcée sur le formulaire si possible
        const form = this.formField.closest('form');
        if (form) {
            // Parfois Django GIS ou Leaflet.draw utilisaient un champ masqué synchronisé.
            // On s'assure ici que si un champ avec le même name existe ailleurs (rare), il est mis à jour.
            const sameNameFields = form.querySelectorAll(`[name="${this.formField.name}"]`);
            sameNameFields.forEach(field => {
                if (field !== this.formField) {
                    console.log('MaplibreFieldStore: syncing another field with same name', field.id);
                    field.value = serializedData;
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }

    /**
     * Sérialise un objet GeoJSON de type FeatureCollection ou GeometryCollection en chaîne JSON.
     * @param data {Object} - L'objet GeoJSON à sérialiser (FeatureCollection ou Geometry).
     * @returns {string} - La chaîne JSON représentant l'objet GeoJSON.
     * @private
     */
    _serialize(data) {
        // Si c'est déjà une géométrie (type + coordinates)
        if (data && data.type && data.coordinates) {
            // S'assurer que MultiPolygon ne va pas dans un PolygonField
            if (data.type === 'MultiPolygon' && this.options.geomType && this.options.geomType.toLowerCase().endsWith('polygon') && !this.options.geomType.toLowerCase().includes('multi')) {
                 console.warn('MaplibreFieldStore: detected MultiPolygon for PolygonField, extracting first polygon');
                 return JSON.stringify({
                     type: 'Polygon',
                     coordinates: data.coordinates[0]
                 });
            }
            // S'assurer que MultiLineString ne va pas dans un LineStringField
            if (data.type === 'MultiLineString' && this.options.geomType && this.options.geomType.toLowerCase().endsWith('linestring') && !this.options.geomType.toLowerCase().includes('multi')) {
                console.warn('MaplibreFieldStore: detected MultiLineString for LineStringField, extracting first line');
                return JSON.stringify({
                    type: 'LineString',
                    coordinates: data.coordinates[0]
                });
            }
            // S'assurer que MultiPoint ne va pas dans un PointField
            if (data.type === 'MultiPoint' && this.options.geomType && this.options.geomType.toLowerCase().endsWith('point') && !this.options.geomType.toLowerCase().includes('multi')) {
                console.warn('MaplibreFieldStore: detected MultiPoint for PointField, extracting first point');
                return JSON.stringify({
                    type: 'Point',
                    coordinates: data.coordinates[0]
                });
            }
            return JSON.stringify(data);
        }

        // Si c'est une FeatureCollection
        if (data && data.type === 'FeatureCollection') {
            if (!data.features || data.features.length === 0) {
                return '';
            }
            const features = data.features;
            return this._serializeByGeomType(features);
        }

        return '';
    }

    /**
     * Sérialise les géométries en fonction de leur type.
     * @param features {Array} - Un tableau de géométries à sérialiser.
     * @returns {string} - La chaîne JSON représentant les géométries.
     * @private
     */
    _serializeByGeomType(features) {
        const last = Array.isArray(features) ? features.at(-1) : null;
        if (last?.geometry) {
            // S'assurer que la géométrie est simple pour un champ simple
            const geom = last.geometry;
            if (geom.type.startsWith('Multi') && !this.options.isCollection) {
                // Si on a un Multi alors qu'on attend un simple (cas possible si Geoman a groupé)
                // On essaie de prendre le premier élément si c'est compatible
                console.warn('MaplibreFieldStore: expected simple geometry but got Multi, taking first component');
                const simpleType = geom.type.replace('Multi', '');
                // Pour Polygon, MultiPolygon.coordinates est Array<Array<Array<Array<number>>>>
                // Polygon.coordinates est Array<Array<Array<number>>>
                return JSON.stringify({
                    type: simpleType,
                    coordinates: geom.coordinates[0]
                });
            }
            return JSON.stringify(geom);
        }

        return '';
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