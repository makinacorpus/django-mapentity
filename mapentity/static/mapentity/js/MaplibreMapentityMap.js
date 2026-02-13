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


            // Load base layers from settings
            const baseLayers = window.SETTINGS.map?.baseLayers || {};
            const { base_layers, overlay_layers } = baseLayers;

            async function loadBaseLayers() {
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
            }
            loadBaseLayers().catch(err => console.error('Failed to load base layers:', err));

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

    /**
     * Extrait toutes les coordonnées [lng, lat] d'une géométrie GeoJSON.
     */
    function _extractAllCoords(geom) {
        const coords = [];
        if (!geom) return coords;
        switch (geom.type) {
            case 'Point':
                coords.push(geom.coordinates);
                break;
            case 'MultiPoint':
            case 'LineString':
                geom.coordinates.forEach(c => coords.push(c));
                break;
            case 'MultiLineString':
            case 'Polygon':
                geom.coordinates.forEach(ring => ring.forEach(c => coords.push(c)));
                break;
            case 'MultiPolygon':
                geom.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(c => coords.push(c))));
                break;
            case 'GeometryCollection':
                (geom.geometries || []).forEach(g => _extractAllCoords(g).forEach(c => coords.push(c)));
                break;
        }
        return coords;
    }

    /**
     * Affiche les géométries secondaires (extra) sur la carte.
     */
    function _renderExtraGeometries(mapInstance, extraGeometries) {
        if (!extraGeometries || extraGeometries.length === 0) return;
        extraGeometries.forEach(extra => {
            if (!extra.geojson) return;
            const geom = extra.geojson;
            const customIcon = extra.custom_icon;

            const points = [];
            if (geom.type === 'Point') {
                points.push(geom.coordinates);
            } else if (geom.type === 'MultiPoint') {
                geom.coordinates.forEach(c => points.push(c));
            } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
                const sourceId = 'extra-geom-' + extra.field;
                mapInstance.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: geom, properties: {} }
                });
                mapInstance.addLayer({
                    id: 'extra-line-' + extra.field,
                    type: 'line',
                    source: sourceId,
                    paint: { 'line-color': '#999', 'line-width': 3, 'line-dasharray': [2, 2] }
                });
                return;
            } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                const sourceId = 'extra-geom-' + extra.field;
                mapInstance.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: geom, properties: {} }
                });
                mapInstance.addLayer({
                    id: 'extra-fill-' + extra.field,
                    type: 'fill',
                    source: sourceId,
                    paint: { 'fill-color': '#999', 'fill-opacity': 0.3 }
                });
                mapInstance.addLayer({
                    id: 'extra-line-' + extra.field,
                    type: 'line',
                    source: sourceId,
                    paint: { 'line-color': '#999', 'line-width': 2 }
                });
                return;
            }

            points.forEach(coords => {
                if (customIcon) {
                    const el = document.createElement('div');
                    el.innerHTML = customIcon;
                    el.style.pointerEvents = 'none';
                    new maplibregl.Marker({ element: el, anchor: 'center' })
                        .setLngLat(coords)
                        .addTo(mapInstance);
                } else {
                    new maplibregl.Marker()
                        .setLngLat(coords)
                        .addTo(mapInstance);
                }
            });
        });
    }

    /**
     * Calcule la bounding box combinée de la géométrie principale + extra géométries
     * et centre la carte dessus.
     */
    function _fitBoundsAllGeometries(mapInstance, objectsLayer, pkVal, extraGeometries) {
        const allCoords = [];

        // 1. Coordonnées de la géométrie principale (depuis objectsLayer)
        if (pkVal) {
            const layersBySource = Object.values(objectsLayer._current_objects).flat();
            for (const layerId of layersBySource) {
                const layer = mapInstance.getLayer(layerId);
                if (!layer) continue;
                const source = mapInstance.getSource(layer.source);
                if (source && source._data) {
                    const features = source._data.geojson ? source._data.geojson.features : (source._data.features || []);
                    const feature = features.find(f => f.properties?.id === pkVal || f.id === pkVal);
                    if (feature && feature.geometry) {
                        _extractAllCoords(feature.geometry).forEach(c => allCoords.push(c));
                        break;
                    }
                }
            }
        }

        // 2. Coordonnées des géométries secondaires
        if (extraGeometries && extraGeometries.length > 0) {
            extraGeometries.forEach(extra => {
                if (extra.geojson) {
                    _extractAllCoords(extra.geojson).forEach(c => allCoords.push(c));
                }
            });
        }

        // 3. Calculer et appliquer la bounding box
        if (allCoords.length === 0) return;

        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        allCoords.forEach(c => {
            if (c[0] < minLng) minLng = c[0];
            if (c[1] < minLat) minLat = c[1];
            if (c[0] > maxLng) maxLng = c[0];
            if (c[1] > maxLat) maxLat = c[1];
        });

        mapInstance.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
            padding: 50,
            maxZoom: 16,
            duration: 0,
            animate: false
        });
    }

    /**
     * Ajoute des marqueurs vert (départ) et rouge (arrivée) aux extrémités des lignes
     * pour l'objet sélectionné en vue détail.
     */
    function _addDetailLineEndpointMarkers(mapInstance, objectsLayer, pkVal) {
        // Trouver la feature de l'objet sélectionné dans les sources
        const layersBySource = Object.values(objectsLayer._current_objects).flat();
        for (const layerId of layersBySource) {
            const layer = mapInstance.getLayer(layerId);
            if (!layer) continue;
            const source = mapInstance.getSource(layer.source);
            if (!source || !source._data) continue;
            const data = source._data;
            const features = data.geojson ? data.geojson.features : (data.features || (data.type === 'Feature' ? [data] : []));
            const feature = features.find(f => f.properties?.id === pkVal || f.id === pkVal);
            if (feature && feature.geometry) {
                const geom = feature.geometry;
                let startCoord = null;
                let endCoord = null;

                if (geom.type === 'LineString' && geom.coordinates.length >= 2) {
                    startCoord = geom.coordinates[0];
                    endCoord = geom.coordinates[geom.coordinates.length - 1];
                } /* else if (geom.type === 'MultiLineString' && geom.coordinates.length > 0) {
                    const firstLine = geom.coordinates[0];
                    const lastLine = geom.coordinates[geom.coordinates.length - 1];
                    if (firstLine && firstLine.length > 0) startCoord = firstLine[0];
                    if (lastLine && lastLine.length > 0) endCoord = lastLine[lastLine.length - 1];
                } else {
                    return;
                }*/

                if (startCoord) _createEndpointMarker(mapInstance, startCoord, '#28a745');
                if (endCoord) _createEndpointMarker(mapInstance, endCoord, '#dc3545');

                // style line with repeted arrows
                if (geom.type === 'LineString') {
                    const sourceId = 'detail-line-arrows-' + pkVal;
                    mapInstance.addSource(sourceId, {
                        type: 'geojson',
                        data: { type: 'Feature', geometry: geom, properties: {} }
                    });
                    const {arrowSize, arrowColor, arrowOpacity, arrowSpacing } = window.SETTINGS.map.styles.detail;
                // load arrow-icon if not already loaded
                    if (!mapInstance.hasImage('arrow-icon')) {
                        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
                        fetch(markersBase + 'arrow.svg')
                            .then(r => r.text())
                            .then(svg => {
                                const coloredSvg = svg.replace('__COLOR__', arrowColor);
                                const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
                                const url = URL.createObjectURL(blob);
                                const img = new Image(20, 20);
                                img.onload = function() {
                                    mapInstance.addImage('arrow-icon', img, { sdf: false });
                                    URL.revokeObjectURL(url);
                                };
                                img.src = url;
                            });
                    }

                    mapInstance.addLayer({
                        id: 'detail-line-arrows-' + pkVal,
                        type: 'symbol',
                        source: sourceId,
                        layout: {
                            'symbol-placement': 'line',
                            'symbol-spacing': arrowSpacing,
                            'icon-image': 'arrow-icon', // Assurez-vous d'avoir une icône d'arrière-plan en forme de flèche dans votre style
                            'icon-size': arrowSize,
                            'icon-rotate': ['get', 'bearing'], // Rotation basée sur la direction de la ligne
                        },
                        paint: {
                            'icon-color': arrowColor,
                            'icon-opacity': arrowOpacity,
                        }
                    });
                }


                return;
            }
        }
    }

    /**
     * Crée un marqueur image de carte standard (pin) à une position donnée.
     */
    function _createEndpointMarker(mapInstance, lngLat, color) {
        const el = document.createElement('div');
        el.style.pointerEvents = 'none';

        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
        fetch(markersBase + 'pin.svg')
            .then(r => r.text())
            .then(svg => {
                el.innerHTML = svg.replace('__COLOR__', color);
                new maplibregl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat(lngLat)
                    .addTo(mapInstance);
            });
    }

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

        // Collecter les géométries secondaires pour le fitBounds global
        const detailMapEl = document.getElementById('detailmap');
        const extraGeometriesAttr = detailMapEl ? detailMapEl.getAttribute('data-extra-geometries') : null;
        let parsedExtraGeometries = [];
        if (extraGeometriesAttr) {
            try {
                parsedExtraGeometries = JSON.parse(extraGeometriesAttr);
            } catch (e) {
                console.warn('MaplibreMapentityMap: failed to parse extra geometries', e);
            }
        }

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
                    objectsLayer.select(pkVal);
                }

                // Afficher les géométries secondaires
                const mapInstance = map.getMap();
                _renderExtraGeometries(mapInstance, parsedExtraGeometries);

                // Ajouter les marqueurs vert/rouge aux extrémités des lignes pour l'objet sélectionné
                if (pkVal) {
                    _addDetailLineEndpointMarkers(mapInstance, objectsLayer, pkVal);
                }

                // Centrer la carte sur la bounding box de TOUTES les géométries
                _fitBoundsAllGeometries(mapInstance, objectsLayer, pkVal, parsedExtraGeometries);
            });
        } else {
            // Pas de layerUrl, afficher quand même les extra géométries
            const mapInstance = map.getMap();
            _renderExtraGeometries(mapInstance, parsedExtraGeometries);
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