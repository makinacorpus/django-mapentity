// Solution 1: Déclencher les événements spécifiques APRÈS l'initialisation complète
document.addEventListener('DOMContentLoaded', function() {

    window.addEventListener('entity:map:ready', function(e) {
        const { map, objectsLayer, context, TILES, bounds, mapentityContext, layerManager, layerUrl } = e.detail;

        // Initialize objectsLayer immediately to catch events early
        objectsLayer.initialize(map.getMap());

        // Initialize additional layers
        window.SETTINGS.layers.forEach((model) => {
            const nameHTML = model.name;
            const modelname = model.id;
            const category = model.category;
            const layerUrl = model.url;

            let style = window.SETTINGS.map.styles[modelname] ?? window.SETTINGS.map.styles['others'];
            let primaryKey = generateUniqueId();

            const current_modelname = document.body.getAttribute('data-modelname');

            if (modelname !== current_modelname) {  // current model is already initialized as objectsLayer on "Objects" section
                const additionalObjectsLayer = new MaplibreObjectsLayer(null, {
                    style,
                    modelname: modelname,
                    readonly: true,
                    nameHTML: nameHTML,
                    category: category,
                    primaryKey: primaryKey,
                    dataUrl: layerUrl,
                    isLazy: true,
                    displayPopup: true,
                });

                additionalObjectsLayer.initialize(map.getMap());
                additionalObjectsLayer.registerLazyLayer(modelname, category, nameHTML, primaryKey, layerUrl);
            }
        });

        map.getMap().on('load', function() {

            map.getMap().addControl(new MaplibreLayerControl(layerManager), 'top-right');

            // Restauration du contexte (vue et couches)
            const mapViewContext = getURLParameter("context");
            if (mapViewContext) {
                // Unification : stocker le contexte URL dans le localStorage, puis restaurer normalement
                mapentityContext.saveContextToLocalStorage(mapViewContext, { prefix: context.viewname });
            }


            // Load Mapbox Baselayers
            fetch('/mapbox/mapbox-baselayers/')
                .then(response => response.json())
                .then(async data => {
                    const { base_layers, overlay_layers } = data;

                    if (base_layers) {
                        for (const layer of base_layers) {
                            await layerManager.addLayerFromUrl(layer.name, {
                                id: 'mapbox-base-' + layer.slug,
                                url: layer.url,
                                isBaseLayer: true,
                                attribution: layer.attribution || ''
                            });
                        }
                    }

                    if (overlay_layers) {
                        for (const layer of overlay_layers) {
                            await layerManager.addLayerFromUrl(layer.name, {
                                id: 'mapbox-overlay-' + layer.slug,
                                url: layer.url,
                                isBaseLayer: false,
                                attribution: layer.attribution || ''
                            });
                        }
                    }
                    mapentityContext.restoreFullContext(map.getMap(), null, {
                        prefix: context.viewname,
                        filter: 'mainfilter',
                        datatable: window.MapEntity.dt,
                        objectsname: context.modelname,
                        // On passe load_filter_form si on est en liste
                        load_filter_form: (window.MapEntity.togglableFilter && window.MapEntity.mapsync) ?
                            window.MapEntity.togglableFilter.load_filter_form.bind(window.MapEntity.togglableFilter, window.MapEntity.mapsync) :
                            async () => {},
                    });
                })
                .catch(err => console.error('Failed to load mapbox baselayers:', err));

            const mergedData = Object.assign({}, context, {
                map,
                objectsLayer,
                bounds,
                layerUrl,
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

            // Sauvegarde du contexte
            const saveContext = () => {
                // On ne sauvegarde que si on a déjà fini de restaurer, pour éviter d'écraser 
                // avec un contexte vide pendant le chargement asynchrone
                if (!layerManager || !layerManager.restoredContext) return;

                mapentityContext.saveFullContext(map.getMap(), {
                    prefix: context.viewname,
                    filter: 'mainfilter',
                    datatable: window.MapEntity.dt,
                    objectsname: context.modelname,
                });
            };

            map.getMap().on('moveend', saveContext);
            map.getMap().on('zoomend', saveContext);
            map.getMap().on('layerManager:baseLayerAdded', saveContext);
            map.getMap().on('layerManager:overlayAdded', saveContext);
            map.getMap().on('layerManager:lazyOverlayAdded', saveContext);
            window.addEventListener('visibilitychange', saveContext);

            window.dispatchEvent(new CustomEvent('entity:view:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map'));
        });
    });

    // Écouteur pour la vue détail
    window.addEventListener('entity:map:detail', function(e) {
        const { map, objectsLayer, modelname, bounds, layerUrl, layerManager } = e.detail;
        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Restauration du contexte (vue et couches)
        const mapViewContext = getURLParameter("context");
        if (mapViewContext) {
            // Unification : stocker le contexte URL dans le localStorage, puis restaurer normalement
            mapentityContext.saveContextToLocalStorage(mapViewContext, { prefix: 'detail' });
        }
        mapentityContext.restoreFullContext(map.getMap(), null, {
            prefix: 'detail',
            objectsname: modelname,
        });

        if (layerUrl) {
            if (mapViewContext && mapViewContext.print) {
                const specified = window.SETTINGS.map.styles.print[modelname];
                if (specified) {
                    objectsLayer.options.detailStyle = Object.assign({}, objectsLayer.options.detailStyle, specified);
                }
            }

            // Charger tous les objets de la couche
            objectsLayer.load(layerUrl).then(() => {
                const pk = document.body.getAttribute('data-pk');
                let pkVal = pk;
                if (pk && /^\d+$/.test(pk)) {
                    pkVal = parseInt(pk, 10);
                }

                if (pkVal) {
                    // Sélectionner et centrer sur l'objet courant
                    objectsLayer.select(pkVal);
                    objectsLayer.jumpTo(pkVal);
                }
            });
        }

        // Contrôles
        const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
            () => {
                const context = mapentityContext.getFullContext(map.getMap());
                context['selector'] = '#detailmap';
                return JSON.stringify(context);
            });
        map.getMap().addControl(screenshotControl, 'top-left');

        // const boundsLayer = objectsLayer.getBoundsLayer();
        map.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

        // Sauvegarde du contexte
        const saveContext = () => {
            if (!layerManager || !layerManager.restoredContext) return;
            mapentityContext.saveFullContext(map.getMap(), {prefix: 'detail'});
        };
        map.getMap().on('moveend', saveContext);
        map.getMap().on('zoomend', saveContext);
        map.getMap().on('layerManager:baseLayerAdded', saveContext);
        map.getMap().on('layerManager:overlayAdded', saveContext);
        map.getMap().on('layerManager:lazyOverlayAdded', saveContext);
        window.addEventListener('visibilitychange', saveContext);
    });

    // Écouteur pour la vue liste
    window.addEventListener('entity:map:list', function(e) {
        const { map, objectsLayer, modelname, bounds, layerUrl, layerManager } = e.detail;

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

        map.getMap().addControl(
            new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: false,
        }), position='bottom-right'
        );
        window.map = map;

        // Gestion de l'historique et des filtres
        const history = window.MapEntity.currentHistory;

        const togglableFilter = new MaplibreMapentityTogglableFilter();
        window.MapEntity.togglableFilter = togglableFilter;

        const mainDatatable = window.MapEntity.dt;

        const mapsync = new MaplibreMapListSync(mainDatatable, map.getMap(),
            objectsLayer, togglableFilter, history);
        window.MapEntity.mapsync = mapsync;

        togglableFilter.button.addEventListener('click', function (e) {
            togglableFilter.load_filter_form(mapsync);
        });

        // Restauration du contexte
        const mapViewContext = getURLParameter("context");
        // mapentityContext.restoreFullContext(map.getMap(), mapViewContext, {
        //     filter: 'mainfilter',
        //     datatable: mainDatatable,
        //     objectsname: modelname,
        //     prefix: 'list',
        //     load_filter_form: togglableFilter.load_filter_form.bind(togglableFilter, mapsync),
        // });

        // Sauvegarde du contexte
        const saveContext = () => {
            if (!layerManager || !layerManager.restoredContext) return;
            mapentityContext.saveFullContext(map.getMap(), {
                filter: 'mainfilter',
                datatable: mainDatatable,
                prefix: 'list',
            });
        };
        map.getMap().on('moveend', saveContext);
        map.getMap().on('zoomend', saveContext);
        window.addEventListener('visibilitychange', saveContext);
    });
});