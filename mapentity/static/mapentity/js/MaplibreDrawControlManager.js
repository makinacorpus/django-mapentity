class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.geoman = null;
        this._container = null;
        this._initializeGeoman();
    }

    /**
     * Initialise Geoman avec les options appropriées en fonction des types de géométries.
     * Cette méthode configure les contrôles d'édition et de dessin en fonction des options fournies.
     */
    _initializeGeoman() {
        // Logique conditionnelle pour les contrôles d'édition
        const shouldShowDragForPoint = this.options.isPoint || this.options.isGeneric || this.options.isCollection;
        const shouldShowEditForOthers = (this.options.isLineString || this.options.isPolygon || this.options.isGeneric || this.options.isCollection) && this.options.modifiable;

        // Pour le drag : visible seulement pour les points (et en mode générique)
        const dragEnabled = shouldShowDragForPoint && this.options.modifiable;

        // Pour l'edit (change) : visible pour tout sauf les points seuls
        const editEnabled = shouldShowEditForOthers;

        // Configuration des options Geoman
        const geomanOptions = {
            controls: {
                draw: {
                    polygon: {
                        title: 'Draw Polygon',
                        uiEnabled: this.options.isPolygon || this.options.isGeneric || this.options.isCollection,
                        active: false,
                    },

                    line: {
                        title: 'Draw Line',
                        uiEnabled: this.options.isLineString || this.options.isGeneric || this.options.isCollection,
                        active: false,
                    },

                    marker: {
                        title: 'Draw Point',
                        uiEnabled: this.options.isPoint || this.options.isGeneric || this.options.isCollection,
                        active: false,
                    },

                    rectangle: {
                        title: 'Draw Rectangle',
                        uiEnabled: this.options.isGeneric || this.options.isCollection,
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
    }

    /**
     * Retourne l'instance Geoman associée à ce gestionnaire.
     * @returns {Geoman.Geoman} L'instance de Geoman
     * */
    getGeoman() {
        return this.geoman;
    }

}