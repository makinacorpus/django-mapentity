/**
 * MaplibreMultiFieldManager
 * 
 * Manages multiple geometry fields on the same map.
 * Provides a single shared Geoman instance and routes events to the active field.
 */
class MaplibreMultiFieldManager {
    constructor(map) {
        this.map = map;
        this.fields = new Map(); // fieldId -> MaplibreGeometryField
        this.activeFieldId = null;
        this.drawManager = null;
        this.fieldSelectorControl = null;
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
        
        // Set first field as active
        if (!this.activeFieldId) {
            this.activeFieldId = field.fieldId;
        }
        
        // Update field selector if multiple fields
        if (this.fields.size > 1 && !this.fieldSelectorControl) {
            this._createFieldSelector();
            // Update controls for the active field when field selector is created
            // Try immediately and listen for gm:loaded event to handle timing
            const updateControls = () => {
                const activeField = this.getActiveField();
                if (activeField) {
                    this._updateGeomanControls(activeField.options);
                }
            };
            
            // Try immediately first
            updateControls();
            
            // Also listen for gm:loaded event in case Geoman wasn't ready
            this.map.once('gm:loaded', updateControls);
        } else if (this.fields.size > 1) {
            this._updateFieldSelector();
        }
        
        return this.drawManager;
    }

    /**
     * Get the currently active field
     * @returns {MaplibreGeometryField|null}
     */
    getActiveField() {
        return this.fields.get(this.activeFieldId);
    }

    /**
     * Set the active field for editing
     * @param {string} fieldId - The ID of the field to activate
     */
    setActiveField(fieldId) {
        if (!this.fields.has(fieldId)) {
            console.warn('MaplibreMultiFieldManager: field not found:', fieldId);
            return;
        }
        
        console.log('MaplibreMultiFieldManager: switching to field', fieldId);
        this.activeFieldId = fieldId;
        
        // Update UI
        this._updateFieldSelectorUI();
        
        // Notify fields about the switch
        this.fields.forEach((field, id) => {
            if (id === fieldId) {
                field.onActivated();
            } else {
                field.onDeactivated();
            }
        });
        
        // Update Geoman controls based on active field's geometry type
        const activeField = this.getActiveField();
        if (activeField) {
            this._updateGeomanControls(activeField.options);
        }
    }

    /**
     * Update Geoman controls visibility based on field options
     * @param {Object} options - The options from the active field
     * @private
     */
    _updateGeomanControls(options) {
        const geoman = this.drawManager.getGeoman();
        if (!geoman || !geoman.loaded) {
            return;
        }

        // Determine which controls to show based on geometry type
        const isGenericOrCollection = options.isGeneric || options.isGeometryCollection;
        const showDrawPolygon = options.isPolygon || options.isMultiPolygon || isGenericOrCollection;
        const showDrawLine = options.isLineString || options.isMultiLineString || isGenericOrCollection;
        const showDrawPoint = options.isPoint || options.isMultiPoint || isGenericOrCollection;
        
        // Update control visibility
        geoman.setControlVisibility('draw', 'polygon', showDrawPolygon);
        geoman.setControlVisibility('draw', 'line', showDrawLine);
        geoman.setControlVisibility('draw', 'marker', showDrawPoint);
        geoman.setControlVisibility('draw', 'rectangle', isGenericOrCollection);
        
        const shouldShowDragForPoint = options.isPoint || options.isMultiPoint || isGenericOrCollection;
        const shouldShowEditForOthers = (options.isLineString || options.isPolygon || 
                                         options.isMultiLineString || options.isMultiPolygon || 
                                         isGenericOrCollection) && options.modifiable;
        
        geoman.setControlVisibility('edit', 'drag', shouldShowDragForPoint && options.modifiable);
        geoman.setControlVisibility('edit', 'change', shouldShowEditForOthers);
        geoman.setControlVisibility('edit', 'delete', options.modifiable);
    }

    /**
     * Create the field selector control
     * @private
     */
    _createFieldSelector() {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'maplibregl-ctrl maplibregl-ctrl-group mapentity-field-selector';
        
        // Set all styles including position before appending to avoid visual flash
        controlDiv.style.cssText = `
            background: white;
            padding: 5px;
            border-radius: 4px;
            box-shadow: 0 0 0 2px rgba(0,0,0,.1);
            margin: 10px;
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1;
        `;
        
        // Use gettext if available, otherwise fall back to English
        const labelText = (typeof gettext === 'function') ? gettext('Editing:') : 'Editing:';
        const label = document.createElement('div');
        label.textContent = labelText;
        label.style.cssText = 'font-weight: bold; margin-bottom: 5px; font-size: 11px;';
        controlDiv.appendChild(label);
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'mapentity-field-buttons';
        controlDiv.appendChild(buttonGroup);
        
        this.fieldSelectorControl = controlDiv;
        this._updateFieldSelector();
        
        // Add to map
        this.map.getContainer().appendChild(controlDiv);
    }

    /**
     * Update the field selector with current fields
     * @private
     */
    _updateFieldSelector() {
        if (!this.fieldSelectorControl) {
            return;
        }
        
        const buttonGroup = this.fieldSelectorControl.querySelector('.mapentity-field-buttons');
        buttonGroup.innerHTML = '';
        
        this.fields.forEach((field, fieldId) => {
            const button = document.createElement('button');
            const fieldName = this._getFieldLabel(fieldId);
            button.textContent = fieldName;
            button.className = 'mapentity-field-button';
            button.style.cssText = `
                display: block;
                width: 100%;
                margin: 2px 0;
                padding: 5px 10px;
                border: 1px solid #ccc;
                background: white;
                cursor: pointer;
                border-radius: 3px;
                font-size: 12px;
            `;
            
            if (fieldId === this.activeFieldId) {
                button.style.background = '#3388ff';
                button.style.color = 'white';
                button.style.borderColor = '#3388ff';
            }
            
            button.onclick = () => {
                this.setActiveField(fieldId);
            };
            
            buttonGroup.appendChild(button);
        });
    }

    /**
     * Update UI after field switch
     * @private
     */
    _updateFieldSelectorUI() {
        if (!this.fieldSelectorControl) {
            return;
        }
        
        const buttons = this.fieldSelectorControl.querySelectorAll('.mapentity-field-button');
        const fieldsArray = Array.from(this.fields.keys());
        
        buttons.forEach((button, index) => {
            const fieldId = fieldsArray[index];
            if (fieldId === this.activeFieldId) {
                button.style.background = '#3388ff';
                button.style.color = 'white';
                button.style.borderColor = '#3388ff';
            } else {
                button.style.background = 'white';
                button.style.color = 'black';
                button.style.borderColor = '#ccc';
            }
        });
    }

    /**
     * Get a human-readable label for a field
     * @param {string} fieldId - The field ID
     * @returns {string} - The field label
     * @private
     */
    _getFieldLabel(fieldId) {
        // Remove 'id_' prefix if present
        let label = fieldId.replace(/^id_/, '');
        
        // Capitalize first letter and replace underscores with spaces
        label = label.charAt(0).toUpperCase() + label.slice(1);
        label = label.replace(/_/g, ' ');
        
        return label;
    }

    /**
     * Route Geoman event to the active field
     * @param {string} eventType - The event type
     * @param {Object} event - The event data
     */
    routeEvent(eventType, event) {
        const activeField = this.getActiveField();
        if (activeField) {
            activeField.handleGeomanEvent(eventType, event);
        }
    }

    /**
     * Get the shared draw manager
     * @returns {MaplibreDrawControlManager}
     */
    getDrawManager() {
        return this.drawManager;
    }
}
