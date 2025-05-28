if (!window.MapEntity) window.MapEntity = {};

document.addEventListener('DOMContentLoaded', function() {

    // Fonction pour ajuster la hauteur maximale des panneaux défilants
    function fillmax() {
        document.querySelectorAll('.scrollable').forEach(function(element) {
            if (window.innerWidth >= 992) {
                // Calcul de la hauteur disponible pour les panneaux
                const rect = element.getBoundingClientRect();
                const computedStyle = getComputedStyle(element);
                const marginTop = parseFloat(computedStyle.marginTop) || 0;
                const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
                const height = window.innerHeight - rect.top - marginTop - marginBottom;
                element.style.maxHeight = height + 'px';
            } else {
                // Désactiver la hauteur maximale pour les petits écrans
                element.style.maxHeight = 'none';
            }
        });
    }

    // Appeler la fonction fillmax après un délai et lors du redimensionnement de la fenêtre
    setTimeout(fillmax, 0);
    window.addEventListener('resize', fillmax);

    // Appliquer le plugin "Chosen" aux éléments avec la classe .chzn-select (si disponible)
    if (window.jQuery && window.jQuery.fn.chosen) {
        jQuery(".chzn-select").chosen();
    }

    // Rendu des onglets de navigation supérieure
    const history = new MaplibreMapentityHistory();
    console.log('history: ' , history);
    if (history) {
        window.MapEntity.currentHistory = history;
        history.render();
    }


    // Faire disparaître les messages de succès/informations après un délai
    const alertBox = document.querySelector('#alert-box');
    if (alertBox) {
        const alerts = alertBox.querySelectorAll('.alert');
        alerts.forEach(function(alert) {
            setTimeout(function() {
                alert.style.transition = 'opacity 0.5s';
                alert.style.opacity = '0';
                setTimeout(function() {
                    alert.remove();
                }, 500);
            }, 2000);
        });
    }

    // Gestion des boutons d'annulation dans les formulaires
    const cancelButton = document.getElementById('button-id-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            window.history.go(-1);
        });
    }

    // Gestion des éléments à affichage automatique
    document.querySelectorAll('.autohide').forEach(function(element) {
        const parent = element.parentElement;
        if (parent) {
            parent.addEventListener('mouseenter', function() {
                element.classList.add('hover');
            });
            parent.addEventListener('mouseleave', function() {
                element.classList.remove('hover');
            });
        }
    });

    // Gestion des vues
    const bodyElement = document.body;
    const context = {
        modelname: bodyElement.dataset.modelname || bodyElement.getAttribute('data-modelname'),
        viewname: bodyElement.dataset.viewname || bodyElement.getAttribute('data-viewname')
    };

    // Récupérer tous les data attributes du body
    Array.from(bodyElement.attributes).forEach(function(attr) {
        if (attr.name.startsWith('data-')) {
            const key = attr.name.substring(5); // Enlever 'data-'
            context[key] = attr.value;
        }
    });

    console.debug('View ', context.modelname, context.viewname);

    // Initialisation automatique de la carte
    function initializeMap(data = {}) {
        console.log('data', data);
        console.log('context', context);

        // Déterminer l'identifiant de la carte en fonction de la vue
        const mapId = context.viewname === 'detail' ? 'detailmap' : 'mainmap';

        // Vérifier si l'élément de carte existe
        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            console.warn(`Élément de carte '${mapId}' non trouvé`);
            return null;
        }

        try {
            // Initialisation de la carte
            const bounds = [window.SETTINGS.map.maplibreConfig.BOUNDS[0], window.SETTINGS.map.maplibreConfig.BOUNDS[1]];
            const map = new MaplibreMap(mapId, bounds);

            // Initialisation des URLs dynamiques
            const modelName = context.modelname;
            const objectUrlTemplate = window.SETTINGS.urls.detail.replace(/modelname/g, modelName);

            // Définir une fonction pour générer les URLs de détails d'un objet
            const getObjectUrl = (properties) => {
                return objectUrlTemplate.replace('0', properties.id);
            };

            // Récupérer le style défini dans les settings (ou fallback)
            let style = window.SETTINGS.map.styles[modelName] || window.SETTINGS.map.styles.others;
            if (typeof style !== "function") {
                style = { ...style };  // créer une copie propre
            }

            // Créer une instance de MaplibreObjectsLayer
            const objectsLayer = new MaplibreObjectsLayer(null, {
                objectUrl: getObjectUrl,
                style: style,
                modelname: modelName,
            });

            // Initialiser la couche d'objets
            objectsLayer.initialize(map.getMap());

            // Ajouter une couche de fond OSM
            window.SETTINGS.map.maplibreConfig.TILES.forEach((tile) => {
                const [tileName, tileUrl, tileAttribution] = tile;
                objectsLayer.addBaseLayer(tileName, {
                    id: tileName + '-base',
                    tiles: [tileUrl],
                    attribution: tileAttribution
                });
            });

            // Créer le contrôle de couches
            const layerControl = new MaplibreLayerControl(objectsLayer);
            map.getMap().addControl(layerControl, 'top-right');

                    // Ajouter un contrôle pour réinitialiser la vue
            map.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

            // Fusionner les données de contexte avec les données de l'événement
            const mergedData = Object.assign({}, context, data, {
                map: map,
                objectsLayer: objectsLayer,
                layerControl: layerControl,
                mapId: mapId
            });
            console.log('data après extension', mergedData);

            // Déclencher l'événement de vue
            const viewEvent = new CustomEvent('entity:view:' + context.viewname, {
                detail: mergedData
            });
            window.dispatchEvent(viewEvent);
            // Déclencher les événements de carte
            const mapViewEvent = new CustomEvent('entity:map:' + context.viewname, {
                detail: mergedData
            });
            window.dispatchEvent(mapViewEvent);

            // Gestion des panneaux redimensionnables
            const resizableElements = document.querySelectorAll("#panelleft, .details-panel");

            resizableElements.forEach(function(element) {
                // Configuration des options de redimensionnement
                const resizableOptions = {
                    handleSelector: ".splitter",
                    resizeHeight: false,
                    onDragEnd: function(e, el, opt) {
                        // Réinitialiser la taille de la carte après le redimensionnement
                        if (map && map.getMap() && map.getMap().resize) {
                            map.getMap().resize();
                        }
                    }
                };

                // Appliquer le plugin resizable si disponible
                if (window.jQuery && window.jQuery.fn.resizable) {
                    window.jQuery(element).resizable(resizableOptions);
                }
            });

            console.log('Carte initialisée avec succès:', mapId);
            return { map, objectsLayer, layerControl, context: mergedData };

        } catch (error) {
            console.error('Erreur lors de l\'initialisation de la carte:', error);
            return null;
        }
    }

    // Initialisation automatique de la carte si les éléments nécessaires sont disponibles
     const mapInstance = initializeMap();
        // Exposer l'instance pour usage externe
     if (mapInstance) {
        window.MapEntity.currentMap = mapInstance;
     }
});