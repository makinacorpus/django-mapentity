// Solution 1: Déclencher les événements spécifiques APRÈS l'initialisation complète
document.addEventListener('DOMContentLoaded', function() {

    window.addEventListener('entity:map:ready', function(e) {
        const { map, objectsLayer, context, TILES, bounds, mapentityContext, layerManager, layerUrl } = e.detail;

        map.getMap().on('load', function() {

            objectsLayer.initialize(map.getMap());

            let tilesArray = Array.isArray(TILES) ? TILES : [TILES];
            tilesArray.forEach(item => {
                if (Array.isArray(item)) {
                    const [name, url, attribution] = item;
                    layerManager.addBaseLayer(name, {
                        id: name + '-base',
                        tiles: [url],
                        attribution
                    });
                } else {
                    console.warn('Item is not a valid tile definition:', item);
                }
            });

            map.getMap().addControl(new MaplibreLayerControl(layerManager), 'top-right');

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

            window.dispatchEvent(new CustomEvent('entity:view:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map'));
        });
    });

    // Écouteur pour la vue détail
    window.addEventListener('entity:map:detail', function(e) {
        const { map, objectsLayer, modelname, bounds, layerUrl } = e.detail;
        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Restauration du contexte de la carte
        const mapViewContext = getURLParameter("context");
        mapentityContext.restoreFullContext(map.getMap(), mapViewContext, {
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
        window.addEventListener('visibilitychange', function() {
            mapentityContext.saveFullContext(map.getMap(), {prefix: 'detail'});
        });
    });

    // Écouteur pour la vue liste
    window.addEventListener('entity:map:list', function(e) {
        const { map, objectsLayer, modelname, bounds, layerUrl } = e.detail;

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
            trackUserLocation: true,
        }), position='bottom-right'
        );
        window.map = map;

        // Gestion de l'historique et des filtres
        const history = window.MapEntity.currentHistory;

        const togglableFilter = new MaplibreMapentityTogglableFilter();

        const mainDatatable = window.MapEntity.dt;

        const mapsync = new MaplibreMapListSync(mainDatatable, map.getMap(),
            objectsLayer, togglableFilter, history);

        togglableFilter.button.addEventListener('click', function (e) {
            togglableFilter.load_filter_form(mapsync);
        });

        // Restauration du contexte
        const mapViewContext = getURLParameter("context");
        mapentityContext.restoreFullContext(map.getMap(), mapViewContext, {
            filter: 'mainfilter',
            datatable: mainDatatable,
            objectsname: modelname,
            prefix: 'list',
            load_filter_form: togglableFilter.load_filter_form.bind(togglableFilter, mapsync),
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