class MaplibreFieldStore {
    constructor(fieldId, options = {}) {
        this.fieldId = fieldId;
        this.formField = document.getElementById(fieldId);
        this.options = { ...options };
    }

    /**
     * Saves data in the form field.
     * @param data - The data to save, which can be a collection of geometries or a GeoJSON object.
     */
    save(data) {
        if (!this.formField) {
            this.formField = document.getElementById(this.fieldId);
            if (!this.formField) {
                console.warn('MaplibreFieldStore: formField not found for id', this.fieldId);
                return;
            }
        }

        const serializedData = (this.options.isGeometryCollection || this.options.isCollection)
            ? this._serializeGeometryCollection(data)
            : this._serialize(data)

        this.formField.value = serializedData;
        
        // Notification for validators and other scripts
        const event = new Event('change', { bubbles: true });
        this.formField.dispatchEvent(event);
        
        if (window.jQuery) {
            window.jQuery(this.formField).trigger('change');
        }

        // We also trigger the input to be sure
        const inputEvent = new Event('input', { bubbles: true });
        this.formField.dispatchEvent(inputEvent);

        // Adding a forced synchronization to the form if possible
        const form = this.formField.closest('form');
        if (form) {
            // Sometimes Django GIS or Leaflet.draw used a synchronized hidden field.
            // We ensure here that if a field with the same name exists elsewhere (rare), it is updated.
            const sameNameFields = form.querySelectorAll(`[name="${this.formField.name}"]`);
            sameNameFields.forEach(field => {
                if (field !== this.formField) {
                    field.value = serializedData;
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }

    /**
     * Serializes a GeoJSON object of type FeatureCollection or GeometryCollection into a JSON string.
     * @param data {Object} - The GeoJSON object to serialize (FeatureCollection or Geometry).
     * @returns {string} - The JSON string representing the GeoJSON object.
     * @private
     */
    _serialize(data) {
        // If it's already a geometry (type + coordinates)
        if (data && data.type && data.coordinates) {
            const geomTypeLower = (this.options.geomType || '').toLowerCase();
            const isGenericGeometry = geomTypeLower === 'geometry';
            
            // Ensure MultiPolygon does not go into a PolygonField
            // Or for a generic type "Geometry", convert a Multi with 1 element to a simple one
            if (data.type === 'MultiPolygon') {
                if ((geomTypeLower.endsWith('polygon') && !geomTypeLower.includes('multi')) ||
                    (isGenericGeometry && data.coordinates.length === 1)) {
                    console.warn('MaplibreFieldStore: detected MultiPolygon, extracting first polygon');
                    return JSON.stringify({
                        type: 'Polygon',
                        coordinates: data.coordinates[0]
                    });
                }
            }
            // Ensure MultiLineString does not go into a LineStringField
            if (data.type === 'MultiLineString') {
                if ((geomTypeLower.endsWith('linestring') && !geomTypeLower.includes('multi')) ||
                    (isGenericGeometry && data.coordinates.length === 1)) {
                    console.warn('MaplibreFieldStore: detected MultiLineString, extracting first line');
                    return JSON.stringify({
                        type: 'LineString',
                        coordinates: data.coordinates[0]
                    });
                }
            }
            // Ensure that MultiPoint does not go into a PointField
            if (data.type === 'MultiPoint') {
                if ((geomTypeLower.endsWith('point') && !geomTypeLower.includes('multi')) ||
                    (isGenericGeometry && data.coordinates.length === 1)) {
                    console.warn('MaplibreFieldStore: detected MultiPoint, extracting first point');
                    return JSON.stringify({
                        type: 'Point',
                        coordinates: data.coordinates[0]
                    });
                }
            }
            return JSON.stringify(data);
        }

        // If it is a FeatureCollection
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
     * Serializes geometries based on their type.
     * @param features {Array} - An array of geometries to serialize.
     * @returns {string} - The JSON string representing the geometries.
     * @private
     */
    _serializeByGeomType(features) {
        const last = Array.isArray(features) ? features.at(-1) : null;
        if (last?.geometry) {
            // Ensure the geometry is simple for a simple field
            const geom = last.geometry;
            if (geom.type.startsWith('Multi') && !this.options.isCollection) {
                // If we have a Multi when we expect a simple (possible case if Geoman has grouped)
                // We try to take the first element if it is compatible
                console.warn('MaplibreFieldStore: expected simple geometry but got Multi, taking first component');
                const simpleType = geom.type.replace('Multi', '');
                // For Polygon, MultiPolygon.coordinates is Array<Array<Array<Array<number>>>>
                // Polygon.coordinates is Array<Array<Array<number>>>
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
     * Serializes a collection of geometries into a GeometryCollection.
     * @param geoemtriesCollection {Object} - A GeoJSON object of type GeometryCollection to serialize.
     * @returns {string} - The JSON string representing the GeometryCollection.
     * @private
     */
    _serializeGeometryCollection(geoemtriesCollection) {
        return JSON.stringify(geoemtriesCollection);
    }
}