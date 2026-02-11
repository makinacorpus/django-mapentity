class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.geoman = null;
        // Registre des champs : { fieldId: { options, shapes } }
        this._fields = {};
        // Le champ actuellement actif (celui dont le bouton de dessin a été cliqué)
        this._activeFieldId = null;
        // Conteneur pour les boutons personnalisés par champ
        this._customButtonsContainer = null;
        this._initializeGeoman();
    }

    /**
     * Initialise Geoman avec tous les contrôles de dessin désactivés.
     * Les vrais boutons seront créés manuellement par champ.
     */
    _initializeGeoman() {
        console.log("MaplibreDrawControlManager initializing with options:", this.options);
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

        // Initialiser Geoman
        this.geoman = new Geoman.Geoman(this.map, geomanOptions);
        window.gm = this.geoman;

        // Déclencher un événement quand Geoman est prêt
        const checkLoaded = () => {
            if (this.geoman.loaded) {
                console.log("MaplibreDrawControlManager: Geoman loaded, firing gm:loaded");
                this._createCustomButtonsContainer();
                // Enregistrer le premier champ (celui qui a créé le DrawControlManager)
                this.registerField(this.options);
                this.map.fire('gm:loaded');
            } else {
                setTimeout(checkLoaded, 50);
            }
        };
        checkLoaded();
    }

    /**
     * Retourne l'instance Geoman associée à ce gestionnaire.
     * @returns {Geoman.Geoman} L'instance de Geoman
     */
    getGeoman() {
        return this.geoman;
    }

    /**
     * Retourne l'ID du champ actuellement actif (celui dont le bouton de dessin a été cliqué).
     * @returns {string|null}
     */
    getActiveFieldId() {
        return this._activeFieldId;
    }

    /**
     * Crée le conteneur pour les boutons personnalisés de dessin par champ.
     * Ce conteneur est placé au-dessus des contrôles Geoman natifs.
     * @private
     */
    _createCustomButtonsContainer() {
        const container = this.map.getContainer();
        // Chercher le conteneur de contrôles en haut à gauche (avec les contrôles Geoman d'édition/suppression)
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
        } else if (ctrlTopLeft.firstChild) {
            ctrlTopLeft.insertBefore(this._customButtonsContainer, ctrlTopLeft.firstChild);
        } else {
            ctrlTopLeft.appendChild(this._customButtonsContainer);
        }
    }

    /**
     * Enregistre un champ géométrique et crée ses boutons de dessin personnalisés.
     * @param {Object} fieldOptions - Les options du champ (fieldId, isPoint, isPolygon, etc.)
     */
    registerField(fieldOptions) {
        const fieldId = fieldOptions.fieldId;
        if (!fieldId) {
            console.warn('MaplibreDrawControlManager: registerField called without fieldId');
            return;
        }
        if (this._fields[fieldId]) {
            console.log('MaplibreDrawControlManager: field already registered', fieldId);
            return;
        }

        // Déterminer les shapes pour ce champ
        const shapes = this._getShapesForField(fieldOptions);
        this._fields[fieldId] = { options: fieldOptions, shapes };

        console.log('MaplibreDrawControlManager: registering field', fieldId, 'with shapes', shapes);

        // Créer les boutons personnalisés pour ce champ
        if (fieldOptions.modifiable && this._customButtonsContainer) {
            this._createFieldButtons(fieldId, fieldOptions, shapes);
        }
    }

    /**
     * Ajoute des contrôles de dessin supplémentaires pour un nouveau champ géométrique
     * qui partage la même carte (via target_map).
     * @param {Object} fieldOptions - Les options du champ (isPoint, isPolygon, etc.)
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
     * Détermine les shapes Geoman pour un champ donné.
     * @param {Object} opts - Les options du champ
     * @returns {Array<string>}
     * @private
     */
    _getShapesForField(opts) {
        const isGenericOrCollection = opts.isGeneric || opts.isGeometryCollection;
        if (isGenericOrCollection) return ['marker', 'line', 'polygon', 'rectangle'];
        const shapes = [];
        if (opts.isPoint || opts.isMultiPoint) shapes.push('marker');
        if (opts.isLineString || opts.isMultiLineString) shapes.push('line');
        if (opts.isPolygon || opts.isMultiPolygon) shapes.push('polygon');
        return shapes;
    }

    /**
     * Crée les boutons de dessin personnalisés pour un champ.
     * @param {string} fieldId - L'ID du champ
     * @param {Object} opts - Les options du champ
     * @param {Array<string>} shapes - Les shapes Geoman pour ce champ
     * @private
     */
    _createFieldButtons(fieldId, opts, shapes) {
        // Icônes SVG par défaut pour chaque shape
        const defaultIcons = {
            marker: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
            line: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 20 12 8 20 16"/></svg>',
            polygon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 18 20 6 20 2 8.5"/></svg>',
            rectangle: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/></svg>',
        };

        // Libellés par défaut
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
            btn.title = opts.fieldLabel
                ? `${defaultLabels[shape]} (${opts.fieldLabel})`
                : `${defaultLabels[shape]} (${fieldId})`;

            // Utiliser l'icône personnalisée si fournie, sinon l'icône par défaut
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
     * Gère le clic sur un bouton de dessin personnalisé.
     * Active le mode de dessin Geoman pour la shape correspondante et marque le champ actif.
     * @param {string} fieldId - L'ID du champ
     * @param {string} shape - La shape Geoman (marker, line, polygon, rectangle)
     * @param {HTMLElement} btn - Le bouton cliqué
     * @private
     */
    _onFieldButtonClick(fieldId, shape, btn) {
        const wasActive = btn.classList.contains('active');

        // Désactiver tous les boutons personnalisés
        this._customButtonsContainer.querySelectorAll('.mapentity-draw-btn').forEach(b => {
            b.classList.remove('active');
            b.style.backgroundColor = 'white';
        });

        if (wasActive) {
            // Désactiver le mode de dessin
            this._activeFieldId = null;
            if (this.geoman && this.geoman.disableDraw) {
                this.geoman.disableDraw();
            }
            return;
        }

        // Activer ce bouton
        btn.classList.add('active');
        btn.style.backgroundColor = '#e0e0e0';

        // Marquer le champ actif AVANT d'activer le mode de dessin
        this._activeFieldId = fieldId;
        console.log('MaplibreDrawControlManager: activating draw mode', shape, 'for field', fieldId);

        // Désactiver d'abord tout mode de dessin actif
        if (this.geoman && this.geoman.disableDraw) {
            this.geoman.disableDraw();
        }

        // Activer le mode de dessin Geoman pour cette shape
        if (this.geoman && this.geoman.enableDraw) {
            this.geoman.enableDraw(shape);
        }
    }

    /**
     * Écoute les événements Geoman pour désactiver les boutons quand le dessin est terminé.
     * Appelé par MaplibreGeometryField après l'enregistrement des handlers.
     */
    setupDrawEndListener() {
        if (this._drawEndListenerSetup) return;
        this._drawEndListenerSetup = true;

        this.map.on('gm:globaldrawmodetoggled', (event) => {
            if (!event.enabled) {
                // Désactiver visuellement tous les boutons personnalisés
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
     * Applique une icône personnalisée aux boutons de dessin Geoman.
     * Remplace le contenu SVG des boutons par le HTML fourni.
     * @param {string} iconHTML - Le HTML de l'icône personnalisée
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
     * Applique une icône personnalisée uniquement aux boutons correspondant au type de géométrie du champ.
     * @param {Object} opts - Les options du champ contenant customIcon et les flags de type géom
     * @private
     */
    _applyCustomIconForShape(opts) {
        const isGenericOrCollection = opts.isGeneric || opts.isGeometryCollection;
        const shapeNames = [];
        if (opts.isPoint || opts.isMultiPoint || isGenericOrCollection) shapeNames.push('marker');
        if (opts.isLineString || opts.isMultiLineString || isGenericOrCollection) shapeNames.push('line');
        if (opts.isPolygon || opts.isMultiPolygon || isGenericOrCollection) shapeNames.push('polygon', 'rectangle');

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
