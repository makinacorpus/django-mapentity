class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.geoman = null;
        this._container = null;
        this._initializeGeoman();
    }

    _initializeGeoman() {
        // Logique conditionnelle pour les contrôles d'édition
        const shouldShowDragForPoint = this.options.isPoint || this.options.isGeneric;
        const shouldShowEditForOthers = (this.options.isLineString || this.options.isPolygon || this.options.isGeneric) && this.options.modifiable;

        // Pour le drag : visible seulement pour les points (et en mode générique)
        const dragEnabled = shouldShowDragForPoint && this.options.modifiable;

        // Pour l'edit (change) : visible pour tout sauf les points seuls
        // Si isGeneric est true, on l'active mais la logique métier gérera la restriction sur les points
        const editEnabled = shouldShowEditForOthers;

        // Configuration des options Geoman
        const geomanOptions = {
            controls: {
                draw: {
                    polygon: {
                        title: 'Draw Polygon',
                        uiEnabled: this.options.isPolygon || this.options.isGeneric,
                        active: false,
                    },

                    line: {
                        title: 'Draw Line',
                        uiEnabled: this.options.isLineString || this.options.isGeneric,
                        active: false,
                    },

                    marker: {
                        title: 'Draw Point',
                        uiEnabled: this.options.isPoint || this.options.isGeneric,
                        active: false,
                    },

                    rectangle: {
                        title: 'Draw Rectangle',
                        uiEnabled: this.options.isGeneric,
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
                },
                edit: {
                    drag: {
                        title: 'Drag',
                        // Drag visible uniquement pour les points (ou en mode générique avec points activés)
                        uiEnabled: dragEnabled,
                        active: false
                    },

                    change: {
                        title: 'Edit',
                        // Edit visible pour les lignes et polygones (pas pour les points seuls)
                        uiEnabled: editEnabled,
                        active: false,
                    },

                    delete: {
                        title: 'Delete',
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
            }
        };

        // Initialiser Geoman
        this.geoman = new Geoman.Geoman(this.map, geomanOptions);

        // Attendre que Geoman soit complètement chargé
        this.map.on("gm:loaded", () => {
            console.log("Geoman fully loaded");
            console.log("Controls configuration:", {
                dragEnabled,
                editEnabled,
                deleteEnabled: this.options.modifiable,
                isGeneric: this.options.isGeneric,
                isPoint: this.options.isPoint,
                isLineString: this.options.isLineString,
                isPolygon: this.options.isPolygon
            });
        });
    }

    // Méthodes pour la compatibilité avec l'ancienne API
    getGeoman() {
        return this.geoman;
    }

    /**
     * Méthodes pour contrôler dynamiquement les contrôles (utilisées par MaplibreGeometryField)
     */
    enableDrag() {
        if (this.geoman?.controls?.edit?.drag) {
            this.geoman.controls.edit.drag.enable();
        }
    }

    disableDrag() {
        if (this.geoman?.controls?.edit?.drag) {
            this.geoman.controls.edit.drag.disable();
        }
    }

    enableEdit() {
        if (this.geoman?.controls?.edit?.change) {
            this.geoman.controls.edit.change.enable();
        }
    }

    disableEdit() {
        if (this.geoman?.controls?.edit?.change) {
            this.geoman.controls.edit.change.disable();
        }
    }

    /**
     * Méthode pour appliquer la logique conditionnelle selon le type de géométrie
     */
    applyConditionalControls(geometryType) {
        if (!this.options.isGeneric) { // peut être pas
            return; // Pas de logique conditionnelle pour les modes spécifiques
        }

        console.log('Applying conditional controls for geometry type:', geometryType);

        if (geometryType === 'Point') {
            // Pour les points : activer drag, désactiver edit
            this.disableEdit();
            this.enableDrag();
            console.log('Point geometry: drag enabled, edit disabled');
        } else {
            // Pour les autres géométries : activer edit, désactiver drag
            this.disableDrag();
            this.enableEdit();
            console.log('Non-point geometry: edit enabled, drag disabled');
        }
    }
}