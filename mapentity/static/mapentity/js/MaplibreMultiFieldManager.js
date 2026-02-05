/**
 * MaplibreMultiFieldManager
 * 
 * Manages multiple geometry fields on the same map.
 * Each field gets its own custom control panel with geometry-specific buttons.
 * Uses a single shared Geoman instance but routes events based on active field.
 */
class MaplibreMultiFieldManager {
    constructor(map) {
        this.map = map;
        this.fields = new Map(); // fieldId -> MaplibreGeometryField
        this.drawManager = null; // Single shared Geoman instance
        this.controlPanels = new Map(); // fieldId -> DOM element
        this.activeFieldId = null;
    }

    /**
     * Register a geometry field with this manager
     * @param {MaplibreGeometryField} field - The geometry field to register
     */
    registerField(field) {
        console.log('MaplibreMultiFieldManager: registering field', field.fieldId);
        this.fields.set(field.fieldId, field);
        
        // Create shared draw manager with combined options from all fields
        if (!this.drawManager) {
            // Initialize with options that support all geometry types
            const combinedOptions = {
                ...field.options,
                isGeneric: true, // Enable all controls
                isGeometryCollection: false
            };
            this.drawManager = new MaplibreDrawControlManager(this.map, combinedOptions);
            this.map._mapentityDrawManager = this.drawManager;
            
            // Hide default Geoman controls, we'll create custom ones
            this._hideDefaultGeomanControls();
        }
        
        // Set first field as active
        if (!this.activeFieldId) {
            this.activeFieldId = field.fieldId;
        }
        
        // Create custom control panel for this field
        this._createControlPanelForField(field);
        
        // Position all control panels
        this._positionControlPanels();
        
        return this.drawManager;
    }

    /**
     * Hide default Geoman UI controls
     * @private
     */
    _hideDefaultGeomanControls() {
        // Wait for Geoman to load
        const hideControls = () => {
            const geoman = this.drawManager.getGeoman();
            if (!geoman || !geoman.loaded) {
                this.map.once('gm:loaded', hideControls);
                return;
            }
            
            // Hide all default Geoman control buttons
            const controlContainer = document.querySelector('.maplibregl-ctrl-group.geoman-toolbar');
            if (controlContainer) {
                controlContainer.style.display = 'none';
            }
        };
        
        hideControls();
    }

    /**
     * Create a custom control panel for a field
     * @param {MaplibreGeometryField} field
     * @private
     */
    _createControlPanelForField(field) {
        const fieldId = field.fieldId;
        const fieldLabel = this._getFieldLabel(fieldId);
        
        // Create panel container
        const panel = document.createElement('div');
        panel.className = 'mapentity-field-controls';
        panel.setAttribute('data-field-id', fieldId);
        panel.style.cssText = `
            background: white;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            margin: 10px;
            position: absolute;
            z-index: 1;
            padding: 10px;
            min-width: 120px;
        `;
        
        // Add field label
        const label = document.createElement('div');
        label.textContent = fieldLabel;
        label.style.cssText = `
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            text-align: center;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 5px;
        `;
        panel.appendChild(label);
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'mapentity-field-buttons';
        buttonsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        
        // Add draw buttons based on field's geometry type
        const options = field.options;
        const isGenericOrCollection = options.isGeneric || options.isGeometryCollection;
        
        if (options.isPolygon || options.isMultiPolygon || isGenericOrCollection) {
            buttonsContainer.appendChild(this._createDrawButton(fieldId, 'polygon', '🔷 Polygon'));
        }
        
        if (options.isLineString || options.isMultiLineString || isGenericOrCollection) {
            buttonsContainer.appendChild(this._createDrawButton(fieldId, 'line', '📏 Line'));
        }
        
        if (options.isPoint || options.isMultiPoint || isGenericOrCollection) {
            buttonsContainer.appendChild(this._createDrawButton(fieldId, 'marker', '📍 Point'));
        }
        
        // Add separator if we have draw buttons and edit buttons
        if (buttonsContainer.children.length > 0 && options.modifiable) {
            const separator = document.createElement('div');
            separator.style.cssText = `
                height: 1px;
                background: #e0e0e0;
                margin: 4px 0;
            `;
            buttonsContainer.appendChild(separator);
        }
        
        // Add edit/delete buttons if modifiable
        if (options.modifiable) {
            const editBtn = this._createActionButton(fieldId, 'edit', '✏️ Edit');
            buttonsContainer.appendChild(editBtn);
            
            const deleteBtn = this._createActionButton(fieldId, 'delete', '🗑️ Delete');
            buttonsContainer.appendChild(deleteBtn);
        }
        
        panel.appendChild(buttonsContainer);
        
        // Add to map container
        this.map.getContainer().appendChild(panel);
        this.controlPanels.set(fieldId, panel);
    }

    /**
     * Create a draw button for a specific geometry type
     * @private
     */
    _createDrawButton(fieldId, drawType, label) {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = `mapentity-draw-btn mapentity-draw-${drawType}`;
        button.setAttribute('data-field-id', fieldId);
        button.setAttribute('data-draw-type', drawType);
        button.setAttribute('aria-label', `Draw ${drawType} for ${this._getFieldLabel(fieldId)}`);
        button.setAttribute('type', 'button'); // Prevent form submission
        button.style.cssText = `
            padding: 8px 12px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s;
            text-align: left;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#e3f2fd';
            button.style.borderColor = '#2196F3';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = 'white';
            button.style.borderColor = '#ddd';
        });
        
        button.addEventListener('click', () => {
            this._activateDrawMode(fieldId, drawType);
            // Highlight active button
            this._highlightActiveButton(button);
        });
        
        return button;
    }

    /**
     * Create an action button (edit, delete)
     * @private
     */
    _createActionButton(fieldId, actionType, label) {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = `mapentity-action-btn mapentity-action-${actionType}`;
        button.setAttribute('data-field-id', fieldId);
        button.setAttribute('data-action-type', actionType);
        button.setAttribute('aria-label', `${actionType} geometries for ${this._getFieldLabel(fieldId)}`);
        button.setAttribute('type', 'button'); // Prevent form submission
        button.style.cssText = `
            padding: 8px 12px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.2s;
            text-align: left;
        `;
        
        button.addEventListener('mouseenter', () => {
            if (actionType === 'delete') {
                button.style.background = '#ffebee';
                button.style.borderColor = '#f44336';
            } else {
                button.style.background = '#fff3e0';
                button.style.borderColor = '#ff9800';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = 'white';
            button.style.borderColor = '#ddd';
        });
        
        button.addEventListener('click', () => {
            this._activateActionMode(fieldId, actionType);
        });
        
        return button;
    }

    /**
     * Highlight the active button
     * @private
     */
    _highlightActiveButton(activeButton) {
        // Remove highlight from all buttons
        document.querySelectorAll('.mapentity-draw-btn').forEach(btn => {
            btn.style.background = 'white';
            btn.style.borderColor = '#ddd';
            btn.style.fontWeight = 'normal';
        });
        
        // Highlight active button
        activeButton.style.background = '#2196F3';
        activeButton.style.borderColor = '#1976D2';
        activeButton.style.color = 'white';
        activeButton.style.fontWeight = 'bold';
    }

    /**
     * Activate draw mode for a specific field
     * @private
     */
    _activateDrawMode(fieldId, drawType) {
        console.log(`MaplibreMultiFieldManager: activating ${drawType} for field ${fieldId}`);
        
        // Set this field as active
        this.activeFieldId = fieldId;
        
        const geoman = this.drawManager.getGeoman();
        if (!geoman || !geoman.loaded) {
            console.error('Geoman not loaded');
            return;
        }
        
        // Disable all draw modes first
        if (geoman.draw) {
            Object.keys(geoman.draw).forEach(mode => {
                if (geoman.draw[mode] && geoman.draw[mode].enabled && typeof geoman.draw[mode].disable === 'function') {
                    geoman.draw[mode].disable();
                }
            });
        }
        
        // Enable the requested draw mode
        if (geoman.draw && geoman.draw[drawType] && typeof geoman.draw[drawType].enable === 'function') {
            geoman.draw[drawType].enable();
        }
    }

    /**
     * Activate action mode (edit/delete) for a specific field
     * @private
     */
    _activateActionMode(fieldId, actionType) {
        console.log(`MaplibreMultiFieldManager: activating ${actionType} for field ${fieldId}`);
        
        this.activeFieldId = fieldId;
        
        const geoman = this.drawManager.getGeoman();
        if (!geoman || !geoman.loaded) {
            console.error('Geoman not loaded');
            return;
        }
        
        const field = this.fields.get(fieldId);
        if (!field) {
            console.error('Field not found', fieldId);
            return;
        }
        
        if (actionType === 'edit') {
            // Enable edit mode for the field's features
            if (geoman.edit && geoman.edit.change) {
                if (geoman.edit.change.enabled) {
                    geoman.edit.change.disable();
                } else {
                    geoman.edit.change.enable();
                }
            }
        } else if (actionType === 'delete') {
            // Delete all features for this field
            if (field.gmEvents && field.gmEvents.length > 0) {
                // Simple confirmation for now - can be enhanced with custom modal
                const fieldLabel = this._getFieldLabel(fieldId);
                const message = `Delete all geometries for ${fieldLabel}?`;
                
                // Use window.confirm for basic functionality
                // TODO: Replace with custom accessible modal dialog
                if (window.confirm(message)) {
                    field.gmEvents.forEach(event => {
                        if (event.feature && event.feature.remove) {
                            try {
                                event.feature.remove();
                            } catch (e) {
                                console.warn('Error removing feature', e);
                            }
                        }
                    });
                    field.gmEvents = [];
                    field._saveToTextarea();
                }
            }
        }
    }

    /**
     * Position control panels on the map
     * @private
     */
    _positionControlPanels() {
        // Use requestAnimationFrame to ensure DOM layout is complete
        requestAnimationFrame(() => {
            const panels = Array.from(this.controlPanels.values());
            
            // Position panels vertically along the left side
            let topOffset = 10;
            panels.forEach(panel => {
                panel.style.top = `${topOffset}px`;
                panel.style.left = '10px';
                topOffset += panel.offsetHeight + 10;
            });
        });
    }

    /**
     * Get a human-readable label for a field
     * @param {string} fieldId
     * @returns {string}
     * @private
     */
    _getFieldLabel(fieldId) {
        const match = fieldId.match(/id_(.+)$/);
        if (match) {
            const fieldName = match[1];
            // Replace underscores with spaces and capitalize each word
            return fieldName
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return fieldId;
    }

    /**
     * Route Geoman event to the active field
     * @param {string} eventType - The event type
     * @param {Object} event - The event data
     */
    routeEvent(eventType, event) {
        // Route to the currently active field
        const activeField = this.fields.get(this.activeFieldId);
        if (activeField) {
            console.log(`MaplibreMultiFieldManager: routing event to field ${this.activeFieldId}`);
            activeField.handleGeomanEvent(eventType, event);
        }
    }

    /**
     * Get all registered fields
     * @returns {Map}
     */
    getAllFields() {
        return this.fields;
    }

    /**
     * Get the shared draw manager
     * @returns {MaplibreDrawControlManager}
     */
    getDrawManager() {
        return this.drawManager;
    }
}
