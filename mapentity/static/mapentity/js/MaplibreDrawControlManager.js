class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.geoman = null;
        this._initializeGeoman();
    }

    /**
     * Initialise Geoman avec les options appropriées en fonction des types de géométries.
     * Cette méthode configure les contrôles d'édition et de dessin en fonction des options fournies.
     */
    _initializeGeoman() {
        // Logique conditionnelle pour les contrôles d'édition
        const isSimpleType = this.options.isPoint || this.options.isLineString || this.options.isPolygon;
        const isCollectionType = this.options.isCollection || this.options.isGeneric;

        // On peut ajouter si :
        // - C'est une collection/générique
        // - OU si c'est un type simple MAIS qu'on n'est pas en mode édition (isUpdate)
        // (En mode édition type simple, on ne peut que modifier l'existant)
        const canAddSimple = !this.options.isUpdate;
        
        const showDrawPolygon = (this.options.isPolygon && canAddSimple) || isCollectionType;
        const showDrawLine = (this.options.isLineString && canAddSimple) || isCollectionType;
        const showDrawPoint = (this.options.isPoint && canAddSimple) || isCollectionType;

        const shouldShowDragForPoint = this.options.isPoint || isCollectionType;
        const shouldShowEditForOthers = (this.options.isLineString || this.options.isPolygon || isCollectionType) && this.options.modifiable;

        // Pour le drag : visible seulement pour les points (et en mode générique)
        const dragEnabled = shouldShowDragForPoint && this.options.modifiable;

        // Pour l'edit (change) : visible pour tout sauf les points seuls
        const editEnabled = shouldShowEditForOthers;

        // Configuration des options Geoman
        console.log("MaplibreDrawControlManager initializing with options:", this.options);
        const geomanOptions = {
            controls: {
                draw: {
                    polygon: {
                        title: 'Draw Polygon',
                        uiEnabled: showDrawPolygon,
                        active: false,
                    },

                    line: {
                        title: 'Draw Line',
                        uiEnabled: showDrawLine,
                        active: false,
                    },

                    marker: {
                        title: 'Draw Point',
                        uiEnabled: showDrawPoint,
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
                    ellipse: {
                        title: "Draw Ellipse",
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
            },
            // Options de style pour assurer la visibilité des géométries
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

        // Déclencher un événement quand Geoman est prêt
        const checkLoaded = () => {
            if (this.geoman.loaded) {
                console.log("MaplibreDrawControlManager: Geoman loaded, firing gm:loaded");
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
     * */
    getGeoman() {
        return this.geoman;
    }

}