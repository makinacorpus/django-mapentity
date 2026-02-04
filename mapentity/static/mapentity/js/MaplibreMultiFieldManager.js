/**
 * MaplibreMultiFieldManager
 * 
 * Manages multiple geometry fields on the same map.
 * Shows all controls simultaneously and routes events based on geometry type.
 */
class MaplibreMultiFieldManager {
    constructor(map) {
        this.map = map;
        this.fields = new Map(); // fieldId -> MaplibreGeometryField
        this.drawManager = null;
    }

    /**
     * Register a geometry field with this manager
     * @param {MaplibreGeometryField} field - The geometry field to register
     */
    registerField(field) {
        console.log('MaplibreMultiFieldManager: registering field', field.fieldId);
        this.fields.set(field.fieldId, field);
        
        // Initialize draw manager with first field's options
        if (!this.drawManager) {
            this.drawManager = new MaplibreDrawControlManager(this.map, field.options);
            // Store draw manager on map for future fields
            this.map._mapentityDrawManager = this.drawManager;
        }
        
        // No active field concept - all fields are active simultaneously
        // Update controls to show all geometry types when second field registers
        if (this.fields.size > 1) {
            this._updateGeomanControlsForAllFields();
        }
        
        return this.drawManager;
    }

    /**
     * Get all registered fields
     * @returns {Map} Map of fieldId -> MaplibreGeometryField
     */
    getAllFields() {
        return this.fields;
    }

    /**
     * Update Geoman controls to show all controls for all registered fields
     * @private
     */
    _updateGeomanControlsForAllFields() {
        const geoman = this.drawManager.getGeoman();
        if (!geoman || !geoman.loaded) {
            // Wait for Geoman to load
            this.map.once('gm:loaded', () => this._updateGeomanControlsForAllFields());
            return;
        }

        // Collect all geometry types from all fields
        let showDrawPolygon = false;
        let showDrawLine = false;
        let showDrawPoint = false;
        let isGenericOrCollection = false;
        let allModifiable = true; // Start true, becomes false if any field is not modifiable

        this.fields.forEach((field) => {
            const options = field.options;
            isGenericOrCollection = isGenericOrCollection || options.isGeneric || options.isGeometryCollection;
            showDrawPolygon = showDrawPolygon || options.isPolygon || options.isMultiPolygon;
            showDrawLine = showDrawLine || options.isLineString || options.isMultiLineString;
            showDrawPoint = showDrawPoint || options.isPoint || options.isMultiPoint;
            allModifiable = allModifiable && options.modifiable;
        });

        // Show controls for all geometry types present across all fields
        showDrawPolygon = showDrawPolygon || isGenericOrCollection;
        showDrawLine = showDrawLine || isGenericOrCollection;
        showDrawPoint = showDrawPoint || isGenericOrCollection;

        // Update control visibility
        geoman.setControlVisibility('draw', 'polygon', showDrawPolygon);
        geoman.setControlVisibility('draw', 'line', showDrawLine);
        geoman.setControlVisibility('draw', 'marker', showDrawPoint);
        geoman.setControlVisibility('draw', 'rectangle', isGenericOrCollection);

        const shouldShowDrag = (showDrawPoint || isGenericOrCollection) && allModifiable;
        const shouldShowEdit = ((showDrawLine || showDrawPolygon || isGenericOrCollection) && allModifiable);

        geoman.setControlVisibility('edit', 'drag', shouldShowDrag);
        geoman.setControlVisibility('edit', 'change', shouldShowEdit);
        geoman.setControlVisibility('edit', 'delete', allModifiable);

        console.log('MaplibreMultiFieldManager: updated controls for all fields', {
            polygon: showDrawPolygon,
            line: showDrawLine,
            marker: showDrawPoint
        });
    }

    /**
     * Route a feature to the appropriate field based on its geometry type
     * @param {string} geometryType - The geometry type (Point, LineString, Polygon, etc.)
     * @returns {MaplibreGeometryField|null} The field that should handle this feature
     */
    getFieldForGeometryType(geometryType) {
        // Find the first field that matches the geometry type
        for (const field of this.fields.values()) {
            const options = field.options;
            
            // Check if this field handles this geometry type
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                if (options.isPoint || options.isMultiPoint || options.isGeneric || options.isGeometryCollection) {
                    return field;
                }
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                if (options.isLineString || options.isMultiLineString || options.isGeneric || options.isGeometryCollection) {
                    return field;
                }
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                if (options.isPolygon || options.isMultiPolygon || options.isGeneric || options.isGeometryCollection) {
                    return field;
                }
            }
        }
        
        // Fallback to first field if no specific match
        return this.fields.values().next().value || null;
    }

    /**
     * Route Geoman event to the appropriate field based on geometry type
     * @param {string} eventType - The event type
     * @param {Object} event - The event data
     */
    routeEvent(eventType, event) {
        // For create events, route to the field that matches the geometry type
        if (eventType === 'gm:create' && event.feature) {
            const geometryType = event.feature.geometry?.type || event.feature.getGeoJson?.()?.geometry?.type;
            if (geometryType) {
                const targetField = this.getFieldForGeometryType(geometryType);
                if (targetField) {
                    console.log(`MaplibreMultiFieldManager: routing ${geometryType} feature to field ${targetField.fieldId}`);
                    targetField.handleGeomanEvent(eventType, event);
                    return;
                }
            }
        }
        
        // For other events, route to all fields and let them handle appropriately
        this.fields.forEach((field) => {
            field.handleGeomanEvent(eventType, event);
        });
    }

    /**
     * Get the shared draw manager
     * @returns {MaplibreDrawControlManager}
     */
    getDrawManager() {
        return this.drawManager;
    }
}
