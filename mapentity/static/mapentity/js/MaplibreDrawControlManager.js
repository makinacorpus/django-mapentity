class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.geoman = null;
        // Registre des champs : { fieldId: { options, shapes } }
        this._fields = {};
        // The currently active field (the one for which the drawing button was clicked)
        this._activeFieldId = null;
        // Container for custom buttons by field
        this._customButtonsContainer = null;
        this._initializeGeoman();
    }

    /**
     * Initialize Geoman with all drawing controls disabled.
     * Real buttons will be created manually per field.
     */
    _initializeGeoman() {
        const geomanOptions = {
            controls: {
                draw: {
                    polygon: {
                        title: gettext('Draw Polygon'),
                        uiEnabled: false,
                        active: false,
                    },
                    line: {
                        title: gettext('Draw Line'),
                        uiEnabled: false,
                        active: false,
                    },
                    marker: {
                        title: gettext('Draw Point'),
                        uiEnabled: false,
                        active: false,
                    },
                    rectangle: {
                        title: gettext('Draw Rectangle'),
                        uiEnabled: false,
                        active: false,
                    },
                    circle_marker: {
                        title: 'Draw Circle Marker',
                        uiEnabled: false,
                        active: false,
                    },
                    text_marker: {
                        title: "Draw Text Marker",
                        uiEnabled: false,
                        active: false,
                    },
                    circle: {
                        title: "Draw Circle",
                        uiEnabled: false,
                        active: false,
                    },
                    ellipse: {
                        title: "Draw Ellipse",
                        uiEnabled: false,
                        active: false,
                    },
                },
                edit: {
                    drag: {
                        title: gettext('Drag'),
                        uiEnabled: this.options.modifiable,
                        active: false
                    },
                    change: {
                        title: gettext('Edit'),
                        uiEnabled: this.options.modifiable,
                        active: false,
                    },
                    delete: {
                        title: gettext('Delete'),
                        uiEnabled: this.options.modifiable,
                        active: false,
                    },
                    rotate: {
                        title: 'Rotate',
                        uiEnabled: false,
                        active: false,
                    },
                    cut: {
                        title: 'Cut',
                        uiEnabled: false,
                        active: false
                    }
                },
                helper: {
                    snapping: {
                        title: 'Snapping',
                        uiEnabled: false,
                        active: false,
                    },
                    zoom_to_features: {
                        title: "Zoom to features",
                        uiEnabled: false,
                        active: false,
                    },
                    shape_markers: {
                        title: "Shape Markers",
                        uiEnabled: false,
                        active: false,
                    }
                }
            },
            pathOptions: {
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.2,
                weight: 3,
                opacity: 1
            }
        };

        // Init Geoman
        this.geoman = new Geoman.Geoman(this.map, geomanOptions);
        window.gm = this.geoman;

        // Trigger an event when Geoman is ready
        const checkLoaded = () => {
            if (this.geoman.loaded) {
                this._createCustomButtonsContainer();
                // Register the first field (the one that created the DrawControlManager)
                this.registerField(this.options);
                this.map.fire('gm:loaded');
            } else {
                setTimeout(checkLoaded, 50);
            }
        };
        checkLoaded();
    }

    /**
     * Returns the Geoman instance associated with this manager.
     * @returns {Geoman.Geoman} The Geoman instance
     */
    getGeoman() {
        return this.geoman;
    }

    /**
     * Returns the ID of the currently active field (the one whose drawing button was clicked).
     * @returns {string|null}
     */
    getActiveFieldId() {
        return this._activeFieldId;
    }

    /**
     * Creates the container for custom drawing buttons per field.
     * This container is placed above the native Geoman controls.
     * @private
     */
    _createCustomButtonsContainer() {
        const container = this.map.getContainer();
        // Look for the top-left control container (with Geoman edit/delete controls)
        let ctrlTopLeft = container.querySelector('.geoman-controls');
        if (!ctrlTopLeft) {
            ctrlTopLeft = container;
        }

        this._customButtonsContainer = document.createElement('div');
        this._customButtonsContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group mapentity-field-draw-buttons';
        this._customButtonsContainer.style.cssText = 'margin-top: 4px;';

        // Chercher le conteneur Geoman d'édition pour insérer les boutons de dessin juste avant
        const geomanEditSection = ctrlTopLeft.querySelector('.geoman-edit-section');
        if (geomanEditSection) {
            ctrlTopLeft.insertBefore(this._customButtonsContainer, geomanEditSection);
            // Assign IDs to Geoman edit buttons for e2e test selectors
            this._assignEditButtonIds(geomanEditSection);
        } else if (ctrlTopLeft.firstChild) {
            ctrlTopLeft.insertBefore(this._customButtonsContainer, ctrlTopLeft.firstChild);
        } else {
            ctrlTopLeft.appendChild(this._customButtonsContainer);
        }
    }

    /**
     * Assigns IDs to Geoman edit buttons for e2e test selectors.
     * Maps button titles to standardized IDs.
     * @param {HTMLElement} editSection - The Geoman edit section
     * @private
     */
    _assignEditButtonIds(editSection) {
        const titleToId = {
            'drag': 'id_edit_drag',
            'edit': 'id_edit_change',
            'delete': 'id_edit_delete',
        };
        const buttons = editSection.querySelectorAll('button');
        buttons.forEach(btn => {
            const title = (btn.title || btn.getAttribute('aria-label') || '').toLowerCase();
            for (const [key, id] of Object.entries(titleToId)) {
                if (title.includes(key) && !document.getElementById(id)) {
                    btn.id = id;
                    break;
                }
            }
        });
    }

    /**
     * Registers a geometric field and creates its custom drawing buttons.
     * @param {Object} fieldOptions - The field options (fieldId, isPoint, isPolygon, etc.)
     */
    registerField(fieldOptions) {
        const fieldId = fieldOptions.fieldId;
        if (!fieldId) {
            console.warn('MaplibreDrawControlManager: registerField called without fieldId');
            return;
        }
        if (this._fields[fieldId]) {
            return;
        }

        // Déterminer les shapes pour ce champ
        const shapes = this._getShapesForField(fieldOptions);
        this._fields[fieldId] = { options: fieldOptions, shapes };

        // Créer les boutons personnalisés pour ce champ
        if (fieldOptions.modifiable && this._customButtonsContainer) {
            this._createFieldButtons(fieldId, fieldOptions, shapes);
        }
    }

    /**
     * Adds additional drawing controls for a new geometric field
     * that shares the same map (via target_map).
     * @param {Object} fieldOptions - The field options (isPoint, isPolygon, etc.)
     */
    addFieldControls(fieldOptions) {
        if (!this.geoman || !this.geoman.loaded) {
            const checkAndAdd = () => {
                if (this.geoman && this.geoman.loaded) {
                    this.registerField(fieldOptions);
                } else {
                    setTimeout(checkAndAdd, 50);
                }
            };
            checkAndAdd();
            return;
        }
        this.registerField(fieldOptions);
    }

    /**
     * Determines the Geoman shapes for a given field.
     * @param {Object} opts - The field options
     * @returns {Array<string>} - The Geoman shapes for the field
     * @private
     */
    _getShapesForField(opts) {
        if (opts.geomTypes && opts.geomTypes.length > 0) {
            const shapes = [];
            opts.geomTypes.forEach(gt => {
                if (gt.includes('point') && !shapes.includes('marker')) {
                    shapes.push('marker');
                }
                if (gt.includes('linestring') && !shapes.includes('line')) {
                    shapes.push('line');
                }
                if (gt.includes('polygon') && !shapes.includes('polygon')) {
                    shapes.push('polygon');
                }
                if (gt.includes('geometry') || gt.includes('geometrycollection')) {
                    ['marker', 'line', 'polygon', 'rectangle'].forEach(s => {
                        if (!shapes.includes(s)) shapes.push(s);
                    });
                }
            });
            return shapes;
        }
        const isGenericOrCollection = opts.isGeneric || opts.isGeometryCollection;
        if (isGenericOrCollection) return ['marker', 'line', 'polygon', 'rectangle'];
        const shapes = [];
        if (opts.isPoint || opts.isMultiPoint) shapes.push('marker');
        if (opts.isLineString || opts.isMultiLineString) shapes.push('line');
        if (opts.isPolygon || opts.isMultiPolygon) shapes.push('polygon');
        return shapes;
    }

    /**
     * Creates custom drawing buttons for a field.
     * @param {string} fieldId - The ID of the field
     * @param {Object} opts - The field options
     * @param {Array<string>} shapes - The Geoman shapes for the field
     * @private
     */
    _createFieldButtons(fieldId, opts, shapes) {
        // Default SVG icons for each shape (referenced from static files)
        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
        const defaultIcons = {
            marker: `<img src="${markersBase}marker.svg" width="18" height="18" alt="marker">`,
            line: `<img src="${markersBase}line.svg" width="18" height="18" alt="line">`,
            polygon: `<img src="${markersBase}polygon.svg" width="18" height="18" alt="polygon">`,
            rectangle: `<img src="${markersBase}rectangle.svg" width="18" height="18" alt="rectangle">`,
        };

        // Default labels
        const defaultLabels = {
            marker: gettext('Draw Point'),
            line: gettext('Draw Line'),
            polygon: gettext('Draw Polygon'),
            rectangle: gettext('Draw Rectangle'),
        };

        shapes.forEach(shape => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mapentity-draw-btn';
            btn.dataset.fieldId = fieldId;
            btn.dataset.shape = shape;
            // Assign an id for e2e test selectors: id_draw_{shape}
            // If multiple fields share the same shape, append fieldId to avoid duplicates
            const baseDrawId = 'id_draw_' + shape;
            if (!document.getElementById(baseDrawId)) {
           /*     btn.id = baseDrawId;
            } else {*/
                btn.id = fieldId + '_draw_' + shape;
            }
            btn.title = opts.fieldLabel
                ? `${defaultLabels[shape]} (${opts.fieldLabel})`
                : `${defaultLabels[shape]} (${fieldId})`;

            // Use the custom icon if provided, otherwise use the default icon
            if (opts.customIcon) {
                btn.innerHTML = opts.customIcon;
            } else {
                btn.innerHTML = defaultIcons[shape] || defaultIcons.marker;
            }

            btn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:30px;height:30px;cursor:pointer;border:none;background:white;padding:2px;';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._onFieldButtonClick(fieldId, shape, btn);
            });

            this._customButtonsContainer.appendChild(btn);
        });
    }

    /**
     * Handles the click on a custom drawing button.
     * Activates the Geoman drawing mode for the corresponding shape and marks the field as active.
     * @param {string} fieldId - The ID of the field
     * @param {string} shape - The Geoman shape (marker, line, polygon, rectangle)
     * @param {HTMLElement} btn - The clicked button
     * @private
     */
    _onFieldButtonClick(fieldId, shape, btn) {
        const wasActive = btn.classList.contains('active');

        // Deactivate all custom buttons
        this._customButtonsContainer.querySelectorAll('.mapentity-draw-btn').forEach(b => {
            b.classList.remove('active');
            b.style.backgroundColor = 'white';
        });

        if (wasActive) {
            // Deactivate drawing mode
            this._activeFieldId = null;
            if (this.geoman && this.geoman.disableDraw) {
                this.geoman.disableDraw();
            }
            return;
        }

        // Activate this button
        btn.classList.add('active');
        btn.style.backgroundColor = '#e0e0e0';

        // Mark the field as active BEFORE activating the drawing mode
        this._activeFieldId = fieldId;

        // Deactivate any active drawing mode first
        if (this.geoman && this.geoman.disableDraw) {
            this.geoman.disableDraw();
        }

        // Activate the Geoman drawing mode for this shape
        if (this.geoman && this.geoman.enableDraw) {
            this.geoman.enableDraw(shape);
        }
    }

    /**
     * Listens to Geoman events to deactivate buttons when drawing is finished.
     * Called by MaplibreGeometryField after registering the handlers.
     */
    setupDrawEndListener() {
        if (this._drawEndListenerSetup) return;
        this._drawEndListenerSetup = true;

        this.map.on('gm:globaldrawmodetoggled', (event) => {
            if (!event.enabled) {
                // Deactivate all custom buttons visually
                if (this._customButtonsContainer) {
                    this._customButtonsContainer.querySelectorAll('.mapentity-draw-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.backgroundColor = 'white';
                    });
                }
            }
        });
    }

    /**
     * Applies a custom icon to Geoman drawing buttons.
     * Replaces the SVG content of the buttons with the provided HTML.
     * @param {string} iconHTML - The HTML of the custom icon
     * @private
     */
    _applyCustomIcons(iconHTML) {
        const container = this.map.getContainer();
        const drawButtons = container.querySelectorAll('.maplibregl-ctrl-top-right .geoman-draw-section button');
        drawButtons.forEach(btn => {
            const svg = btn.querySelector('svg');
            if (svg) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = iconHTML;
                svg.replaceWith(wrapper.firstElementChild || wrapper);
            }
        });
    }

    /**
     * Applies a custom icon only to buttons corresponding to the field's geometry type.
     * @param {Object} opts - The field options containing customIcon and geometry type flags
     * @private
     */
    _applyCustomIconForShape(opts) {
        let shapeNames = [];
        if (opts.geomTypes && opts.geomTypes.length > 0) {
            opts.geomTypes.forEach(gt => {
                if (gt.includes('point') && !shapeNames.includes('marker')) shapeNames.push('marker');
                if (gt.includes('linestring') && !shapeNames.includes('line')) shapeNames.push('line');
                if (gt.includes('polygon')) {
                    if (!shapeNames.includes('polygon')) shapeNames.push('polygon');
                    if (!shapeNames.includes('rectangle')) shapeNames.push('rectangle');
                }
                if (gt.includes('geometry') || gt.includes('geometrycollection')) {
                    ['marker', 'line', 'polygon', 'rectangle'].forEach(s => {
                        if (!shapeNames.includes(s)) shapeNames.push(s);
                    });
                }
            });
        } else {
            const isGenericOrCollection = opts.isGeneric || opts.isGeometryCollection;
            if (opts.isPoint || opts.isMultiPoint || isGenericOrCollection) shapeNames.push('marker');
            if (opts.isLineString || opts.isMultiLineString || isGenericOrCollection) shapeNames.push('line');
            if (opts.isPolygon || opts.isMultiPolygon || isGenericOrCollection) shapeNames.push('polygon', 'rectangle');
        }

        const container = this.map.getContainer();
        const drawButtons = container.querySelectorAll('.maplibregl-ctrl-top-right .geoman-draw-section button');
        drawButtons.forEach(btn => {
            const btnShape = btn.getAttribute('data-shape') || btn.getAttribute('data-type') || '';
            if (shapeNames.includes(btnShape.toLowerCase())) {
                const svg = btn.querySelector('svg');
                if (svg) {
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = opts.customIcon;
                    svg.replaceWith(wrapper.firstElementChild || wrapper);
                }
            }
        });
    }
}
