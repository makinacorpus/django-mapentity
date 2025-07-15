// Solution 1: Déclencher les événements spécifiques APRÈS l'initialisation complète
document.addEventListener('DOMContentLoaded', function() {

    window.addEventListener('entity:map:ready', function(e) {
        const { map, objectsLayer, context, TILES, bounds, mapentityContext } = e.detail;

        map.getMap().on('load', function() {
            objectsLayer.initialize(map.getMap());

            let tilesArray = Array.isArray(TILES) ? TILES : [TILES];
            tilesArray.forEach(item => {
                if (Array.isArray(item) && item.length >= 2) {
                    const [name, url, attribution] = item;
                    objectsLayer.addBaseLayer(name, {
                        id: name + '-base',
                        tiles: [url],
                        attribution
                    });
                } else {
                    console.warn('Item is not a valid tile definition:', item);
                }
            });

            map.getMap().addControl(new MaplibreLayerControl(objectsLayer), 'top-right');

            const mergedData = Object.assign({}, context, {
                map,
                objectsLayer,
                bounds
            });

            // Exposer l'instance
            window.MapEntity.currentMap = { map, objectsLayer, context: mergedData, mapentityContext };

            // Gestion des panneaux redimensionnables
            const resizableElements = document.querySelectorAll("#panelleft, .details-panel");
            resizableElements.forEach(function(element) {
                const resizableOptions = {
                    handleSelector: ".splitter",
                    resizeHeight: false,
                    onDragEnd: function(e, el, opt) {
                        if (map && map.getMap()) {
                            map.getMap().resize();
                        }
                    }
                };
                window.jQuery(element).resizable(resizableOptions);
            });

            // MAINTENANT déclencher les événements spécifiques après l'initialisation complète
            window.dispatchEvent(new CustomEvent('entity:map', {detail : mergedData}));
            window.dispatchEvent(new CustomEvent('entity:view:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map:' + context.viewname, { detail: mergedData }));
        });
    });

    // Écouteur pour la vue détail
    window.addEventListener('entity:map:detail', function(e) {
        const { map, objectsLayer, modelname } = e.detail;
        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Restauration du contexte de la carte
        const mapViewContext = getURLParameter("context");
        mapentityContext.restoreFullContext(map.getMap(), mapViewContext, {
            prefix: 'detail',
            objectsname: modelname,
            objectsLayer: objectsLayer,
        });

        // Affichage de la géométrie de l'objet
        const feature_geojson_url = document.getElementById('detailmap').getAttribute('data-feature-url');

        const fetchFeatureLayer = async (dataUrl) => {
            try {
                const response = await fetch(dataUrl);
                if (!response.ok) {
                    console.error('Erreur lors de la récupération des données GeoJSON:', response.statusText);
                    return;
                }
                const featureData = await response.json();
                if (featureData && featureData.type === 'Feature') {
                    if (mapViewContext && mapViewContext.print) {
                        const specified = window.SETTINGS.map.styles.print[modelname];
                        if (specified) {
                            objectsLayer.options.detailStyle = Object.assign({}, objectsLayer.options.detailStyle, specified);
                        }
                    }
                    objectsLayer.load(feature_geojson_url);
                } else {
                    console.warn('No features found in the GeoJSON data.');
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la feature:', error);
            }
        };

        if (feature_geojson_url) {
            fetchFeatureLayer(feature_geojson_url);
        }

        // Contrôles
        const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
            () => {
                const context = mapentityContext.getFullContext(map.getMap());
                context['selector'] = '#detailmap';
                return JSON.stringify(context);
            });
        map.getMap().addControl(screenshotControl, 'top-left');

        const boundsLayer = objectsLayer.getBoundsLayer();
        map.getMap().addControl(new MaplibreResetViewControl(boundsLayer), 'top-left');

        // Sauvegarde du contexte
        window.addEventListener('visibilitychange', function() {
            mapentityContext.saveFullContext(map.getMap(), {prefix: 'detail'});
        });
    });

    // Écouteur pour la vue liste
    window.addEventListener('entity:map:list', function(e) {
        const { map, objectsLayer, modelname, bounds } = e.detail;
        const layerUrl = window.SETTINGS.urls.layer.replace(/modelname/g, modelname);
        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Charger les objets depuis le backend
        objectsLayer.load(layerUrl);

        // Contrôles
        const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
            () => {
                const context = mapentityContext.getFullContext(map.getMap(), {
                    filter: 'mainfilter',
                    datatable: window.MapEntity.dt,
                    objectsname: modelname,
                    prefix: 'list',
                });
                context['selector'] = '#mainmap';
                return JSON.stringify(context);
            });
        map.getMap().addControl(screenshotControl, 'top-left');

        const fileLayerLoadControl = new MaplibreFileLayerControl({
            layerOptions: {
                style: window.SETTINGS.map.styles.filelayer,
            }
        });
        map.getMap().addControl(fileLayerLoadControl, 'top-left');

        map.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

        // Gestion de l'historique et des filtres
        const history = window.MapEntity.currentHistory;

        const togglableFiltre = new MaplibreMapentityTogglableFiltre();

        const mainDatatable = window.MapEntity.dt;

        const mapsync = new MaplibreMapListSync(mainDatatable, map.getMap(),
            objectsLayer, togglableFiltre, history);

        togglableFiltre.button.addEventListener('click', function (e) {
            togglableFiltre.load_filter_form(mapsync);
        });

        // Restauration du contexte
        const mapViewContext = getURLParameter("context");
        mapentityContext.restoreFullContext(map.getMap(), mapViewContext, {
            filter: 'mainfilter',
            datatable: mainDatatable,
            objectsname: modelname,
            prefix: 'list',
            objectsLayer: objectsLayer,
        });

        // Sauvegarde du contexte
        window.addEventListener('visibilitychange', function() {
            mapentityContext.saveFullContext(map.getMap(), {
                filter: 'mainfilter',
                datatable: mainDatatable,
                prefix: 'list',
            });
        });
    });
});