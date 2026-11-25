document.addEventListener('DOMContentLoaded', function() {

    window.addEventListener('entity:map:ready', function(e) {
        const { map, objectsLayer, context, TILES, bounds, mapentityContext, layerManager, layerUrl, mvtUrl, tilejsonUrl } = e.detail;
        const mapInstance = map.getMap();

        // Initialize objectsLayer immediately to catch events early
        objectsLayer.initialize(mapInstance);

        // Prefetch base layers and overlays in parallel before/during map initialization
        const baseLayersData = window.SETTINGS.map?.baseLayers || {};
        const { base_layers = [], overlay_layers = [] } = baseLayersData;

        const _prefetchLayerConfigs = (layers, isBaseLayer) => {
            const prefix = isBaseLayer ? 'mapbox-base-' : 'mapbox-overlay-';
            return (layers || []).map(layer => {
                const config = {
                    id: prefix + layer.slug,
                    url: layer.url,
                    isBaseLayer,
                    attribution: layer.attribution || '',
                };
                const dataPromise = fetch(layer.url)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .catch(err => {
                        console.error(`Unable to load layer from ${layer.url}:`, err);
                        return null;
                    });
                return { name: layer.name, config, dataPromise };
            });
        };

        const prefetchedBaseLayers = _prefetchLayerConfigs(base_layers, true);
        const prefetchedOverlayLayers = _prefetchLayerConfigs(overlay_layers, false);

        // On detail view, center on server-provided extent immediately and prefetch feature GeoJSON in parallel
        let hasInitialDetailExtent = false;
        let detailFeaturePromise = null;
        if (context.viewname === 'detail') {
            const detailMapEl = document.getElementById('detailmap');
            const hasUrlContext = Boolean(getURLParameter('context'));
            if (detailMapEl && !hasUrlContext) {
                const rawExtent = detailMapEl.getAttribute('data-mapextent');
                if (rawExtent && rawExtent !== 'null') {
                    try {
                        const parsedExtent = JSON.parse(rawExtent);
                        // latlngbounds returns [[minLat, minLng], [maxLat, maxLng]]; MapLibre expects [[minLng, minLat], [maxLng, maxLat]]
                        if (Array.isArray(parsedExtent) && parsedExtent.length === 2 &&
                            Array.isArray(parsedExtent[0]) && Array.isArray(parsedExtent[1]) &&
                            Number.isFinite(parsedExtent[0][0]) && Number.isFinite(parsedExtent[0][1]) &&
                            Number.isFinite(parsedExtent[1][0]) && Number.isFinite(parsedExtent[1][1])) {
                            mapInstance.fitBounds(
                                [[parsedExtent[0][1], parsedExtent[0][0]], [parsedExtent[1][1], parsedExtent[1][0]]],
                                { padding: 50, maxZoom: 16, duration: 0, animate: false }
                            );
                            hasInitialDetailExtent = true;
                        }
                    } catch (err) {
                        console.warn('MaplibreMapentityMap: failed to parse data-mapextent', err);
                    }
                }
            }
            const featureUrl = detailMapEl ? detailMapEl.getAttribute('data-feature-url') : null;
            const pk = document.body.getAttribute('data-pk');
            if (featureUrl && pk) {
                detailFeaturePromise = fetch(featureUrl).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                });
            }
        }

        // Initialize additional layers
        window.SETTINGS.layers.forEach((model) => {
            const nameHTML = model.name;
            const modelname = model.id;
            const category = model.category;
            const layerUrl = model.url;
            const modelTilejsonUrl = model.tilejsonUrl;

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
                    tilejsonUrl: modelTilejsonUrl,
                    isLazy: true,
                    displayPopup: true,
                });

                additionalObjectsLayer.initialize(mapInstance);
                additionalObjectsLayer.registerLazyLayer(modelname, category, nameHTML, primaryKey, layerUrl);
            }
        });

        mapInstance.on('load', async function() {

            // Await prefetched base layers and overlays in parallel, then register in exact order
            const [baseDataList, overlayDataList] = await Promise.all([
                Promise.all(prefetchedBaseLayers.map(item => item.dataPromise)),
                Promise.all(prefetchedOverlayLayers.map(item => item.dataPromise)),
            ]);

            prefetchedBaseLayers.forEach((item, idx) => {
                layerManager.addLayerFromData(item.name, item.config, baseDataList[idx]);
            });
            prefetchedOverlayLayers.forEach((item, idx) => {
                layerManager.addLayerFromData(item.name, item.config, overlayDataList[idx]);
            });

            mapInstance.addControl(new MaplibreLayerControl(layerManager), 'top-right');

            const mergedData = Object.assign({}, context, {
                map,
                objectsLayer,
                bounds,
                layerUrl,
                mvtUrl,
                tilejsonUrl,
                layerManager,
                context,
                hasInitialDetailExtent,
                detailFeaturePromise,
            });

            // Expose the instance
            window.MapEntity.currentMap = { map, objectsLayer, context: mergedData, mapentityContext };

            // Resizable Panel Management
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

            // Context backup
            const saveContext = () => {
                // We only save if we have already finished restoring, to avoid overwriting
                // with an empty context during asynchronous loading
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
            map.getMap().on('layerManager:baseLayerChanged', saveContext);
            map.getMap().on('layerManager:overlayVisibilityChanged', saveContext);
            map.getMap().on('layerManager:lazyLayerVisibilityChanged', saveContext);
            map.getMap().on('mapentity:filterChanged', saveContext);
            window.addEventListener('visibilitychange', saveContext);
            window.addEventListener('pagehide', saveContext);

            window.dispatchEvent(new CustomEvent('entity:view:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map:' + context.viewname, { detail: mergedData }));
            window.dispatchEvent(new CustomEvent('entity:map'));
        });
    });

    /**
     * Extracts all coordinates [lng, lat] from a GeoJSON geometry.
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
     * Displays secondary (extra) geometries on the map.
     * @returns {Object} - { layerIds: string[], markers: maplibregl.Marker[] }
     */
    function _renderExtraGeometries(mapInstance, extraGeometries) {
        const result = { layerIds: [], markers: [] };
        if (!extraGeometries || extraGeometries.length === 0) return result;
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
                const layerId = 'extra-line-' + extra.field;
                mapInstance.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: geom, properties: {} }
                });
                mapInstance.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    paint: { 'line-color': '#999', 'line-width': 3, 'line-dasharray': [2, 2] }
                });
                result.layerIds.push(layerId);
                return;
            } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                const sourceId = 'extra-geom-' + extra.field;
                const fillLayerId = 'extra-fill-' + extra.field;
                const lineLayerId = 'extra-line-' + extra.field;
                mapInstance.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: geom, properties: {} }
                });
                mapInstance.addLayer({
                    id: fillLayerId,
                    type: 'fill',
                    source: sourceId,
                    paint: { 'fill-color': '#999', 'fill-opacity': 0.3 }
                });
                mapInstance.addLayer({
                    id: lineLayerId,
                    type: 'line',
                    source: sourceId,
                    paint: { 'line-color': '#999', 'line-width': 2 }
                });
                result.layerIds.push(fillLayerId, lineLayerId);
                return;
            }

            points.forEach(coords => {
                let marker;
                if (customIcon) {
                    const el = document.createElement('div');
                    el.innerHTML = customIcon;
                    el.style.pointerEvents = 'none';
                    marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                        .setLngLat(coords)
                        .addTo(mapInstance);
                } else {
                    marker = new maplibregl.Marker()
                        .setLngLat(coords)
                        .addTo(mapInstance);
                }
                result.markers.push(marker);
            });
        });
        return result;
    }

    /**
     * Calculate the combined bounding box of the main geometry + extra geometries
     * and center the map on it.
     */
    function _fitBoundsAllGeometries(mapInstance, objectsLayer, pkVal, extraGeometries) {
        const allCoords = [];

        // 1. Main geometry coordinates (from objectsLayer)
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

        // 2. Coordinates of secondary geometries
        if (extraGeometries && extraGeometries.length > 0) {
            extraGeometries.forEach(extra => {
                if (extra.geojson) {
                    _extractAllCoords(extra.geojson).forEach(c => allCoords.push(c));
                }
            });
        }

        // 3. Calculate and apply the bounding box
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
     * Adds green (start) and red (end) markers to the ends of the lines
     * for the selected object in detail view.
     * @returns {Object} - { layerIds: string[], markers: maplibregl.Marker[] }
     */
    function _addDetailLineEndpointMarkers(mapInstance, objectsLayer, pkVal) {
        const result = { layerIds: [], markers: [] };
        // Find the feature of the selected object in the sources
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
                } else if (geom.type === 'MultiLineString' && geom.coordinates.length > 0) {
                    const firstLine = geom.coordinates[0];
                    const lastLine = geom.coordinates[geom.coordinates.length - 1];
                    if (firstLine && firstLine.length > 0) startCoord = firstLine[0];
                    if (lastLine && lastLine.length > 0) endCoord = lastLine[lastLine.length - 1];
                }

                if (startCoord) result.markers.push(_createEndpointMarker(mapInstance, startCoord, '#28a745'));
                if (endCoord) result.markers.push(_createEndpointMarker(mapInstance, endCoord, '#dc3545'));

                // Style line with repeated arrows
                if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
                    const sourceId = 'detail-line-arrows-' + pkVal;
                    mapInstance.addSource(sourceId, {
                        type: 'geojson',
                        data: { type: 'Feature', geometry: geom, properties: {} }
                    });
                    const {arrowSize, arrowColor, arrowOpacity, arrowSpacing } = window.SETTINGS.map.styles.detail;

                    const addArrowLayer = () => {
                        if (mapInstance.getLayer('detail-line-arrows-' + pkVal)) return;
                        mapInstance.addLayer({
                            id: 'detail-line-arrows-' + pkVal,
                            type: 'symbol',
                            source: sourceId,
                            layout: {
                                'symbol-placement': 'line',
                                'symbol-spacing': arrowSpacing,
                                'icon-image': 'arrow-icon',
                                'icon-size': arrowSize,
                                'icon-ignore-placement': true,
                                'icon-allow-overlap': true,
                                'icon-rotation-alignment': 'map',
                            },
                            paint: {
                                'icon-opacity': arrowOpacity,
                            }
                        });
                    };

                    if (mapInstance.hasImage('arrow-icon')) {
                        addArrowLayer();
                    } else {
                        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
                        fetch(markersBase + 'arrow.svg')
                            .then(r => r.text())
                            .then(svg => {
                                const coloredSvg = svg.replace('__COLOR__', arrowColor);
                                const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
                                const url = URL.createObjectURL(blob);
                                const img = new Image(20, 20);
                                img.onload = function() {
                                    if (!mapInstance.hasImage('arrow-icon')) {
                                        mapInstance.addImage('arrow-icon', img, { sdf: false });
                                    }
                                    URL.revokeObjectURL(url);
                                    addArrowLayer();
                                };
                                img.src = url;
                            });
                    }
                }


                return result;
            }
        }
        return result;
    }

    /**
     * Creates a standard map image marker (pin) at a given position.
     * @returns {maplibregl.Marker} - The created marker (added to the map asynchronously)
     */
    function _createEndpointMarker(mapInstance, lngLat, color) {
        const el = document.createElement('div');
        el.style.pointerEvents = 'none';

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(lngLat)
            .addTo(mapInstance);

        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
        fetch(markersBase + 'pin.svg')
            .then(r => r.text())
            .then(svg => {
                el.innerHTML = svg.replace('__COLOR__', color);
            });

        return marker;
    }

    /**
     * Add green (start) and red (end) markers to the ends of the lines
     * from GeoJSON retrieved via fetch (for the detail view in MVT mode).
     * @returns {Object} - { layerIds: string[], markers: maplibregl.Marker[] }
     */
    function _addDetailLineEndpointMarkersFromGeojson(mapInstance, featureGeojson, pkVal) {
        const result = { layerIds: [], markers: [] };
        let geom = null;
        if (featureGeojson.type === 'Feature') {
            geom = featureGeojson.geometry;
        } else if (featureGeojson.type === 'FeatureCollection' && featureGeojson.features) {
            const feature = featureGeojson.features.find(f => f.properties?.id === pkVal || f.id === pkVal);
            if (feature) geom = feature.geometry;
        } else if (featureGeojson.geometry) {
            geom = featureGeojson.geometry;
        }

        if (!geom) return result;

        let startCoord = null;
        let endCoord = null;

        if (geom.type === 'LineString' && geom.coordinates.length >= 2) {
            startCoord = geom.coordinates[0];
            endCoord = geom.coordinates[geom.coordinates.length - 1];
        } else if (geom.type === 'MultiLineString' && geom.coordinates.length > 0) {
            const firstLine = geom.coordinates[0];
            const lastLine = geom.coordinates[geom.coordinates.length - 1];
            if (firstLine.length >= 2) startCoord = firstLine[0];
            if (lastLine.length >= 2) endCoord = lastLine[lastLine.length - 1];
        }

        if (startCoord) result.markers.push(_createEndpointMarker(mapInstance, startCoord, '#28a745'));
        if (endCoord) result.markers.push(_createEndpointMarker(mapInstance, endCoord, '#dc3545'));

        // Style line with repeated arrows
        if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
            const arrowLayerId = 'detail-line-arrows-' + pkVal;
            result.layerIds.push(arrowLayerId);
            const sourceId = 'detail-line-arrows-' + pkVal;
            mapInstance.addSource(sourceId, {
                type: 'geojson',
                data: { type: 'Feature', geometry: geom, properties: {} }
            });
            const {arrowSize, arrowColor, arrowOpacity, arrowSpacing } = window.SETTINGS.map.styles.detail;

            const addArrowLayer = () => {
                if (mapInstance.getLayer('detail-line-arrows-' + pkVal)) return;
                mapInstance.addLayer({
                    id: 'detail-line-arrows-' + pkVal,
                    type: 'symbol',
                    source: sourceId,
                    layout: {
                        'symbol-placement': 'line',
                        'symbol-spacing': arrowSpacing,
                        'icon-image': 'arrow-icon',
                        'icon-size': arrowSize,
                        'icon-ignore-placement': true,
                        'icon-allow-overlap': true,
                        'icon-rotation-alignment': 'map',
                    },
                    paint: {
                        'icon-opacity': arrowOpacity,
                    }
                });
            };

            if (mapInstance.hasImage('arrow-icon')) {
                addArrowLayer();
            } else {
                const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
                fetch(markersBase + 'arrow.svg')
                    .then(r => r.text())
                    .then(svg => {
                        const coloredSvg = svg.replace('__COLOR__', arrowColor);
                        const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const img = new Image(20, 20);
                        img.onload = function() {
                            if (!mapInstance.hasImage('arrow-icon')) {
                                mapInstance.addImage('arrow-icon', img, { sdf: false });
                            }
                            URL.revokeObjectURL(url);
                            addArrowLayer();
                        };
                        img.src = url;
                    });
            }
        }
        return result;
    }

    /**
     * Calculate the bounding box from a GeoJSON retrieved via fetch + extra geometries
     * and center the map on it (for the detail view in MVT mode).
     */
    function _fitBoundsFromGeojson(mapInstance, featureGeojson, extraGeometries) {
        const allCoords = [];

        // 1. Main Geometry Coordinates
        let geom = null;
        if (featureGeojson.type === 'Feature') {
            geom = featureGeojson.geometry;
        } else if (featureGeojson.type === 'FeatureCollection' && featureGeojson.features) {
            featureGeojson.features.forEach(f => {
                if (f.geometry) _extractAllCoords(f.geometry).forEach(c => allCoords.push(c));
            });
        } else if (featureGeojson.geometry) {
            geom = featureGeojson.geometry;
        }
        if (geom) {
            _extractAllCoords(geom).forEach(c => allCoords.push(c));
        }

        // 2. Secondary geometry coordinates
        if (extraGeometries && extraGeometries.length > 0) {
            extraGeometries.forEach(extra => {
                if (extra.geojson) {
                    _extractAllCoords(extra.geojson).forEach(c => allCoords.push(c));
                }
            });
        }

        // 3. Calculate and apply the bounding box
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
     * Collects GeoJSON geometry types recursively (including inside GeometryCollection).
     * @param {Object} geom - GeoJSON geometry
     * @param {Set<string>} foundTypes - Set to populate
     */
    function _collectGeometryTypes(geom, foundTypes) {
        if (!geom || !geom.type) return;
        if (geom.type === 'GeometryCollection') {
            (geom.geometries || []).forEach(g => _collectGeometryTypes(g, foundTypes));
        } else {
            foundTypes.add(geom.type);
        }
    }

    /**
     * Renders dedicated foreground MapLibre layers (with contrasting halo) for the
     * current object on the detail map using its fetched GeoJSON.
     * @returns {{ layerIds: string[], markers: Array }}
     */
    function _renderDetailObjectLayer(mapInstance, featureGeojson, pkVal, objectsLayer) {
        const result = { layerIds: [], markers: [] };
        if (!featureGeojson) return result;

        // Normalize GeoJSON and ensure feature id / properties.id are populated
        let normalizedGeojson;
        if (featureGeojson.type === 'Feature') {
            normalizedGeojson = {
                ...featureGeojson,
                id: featureGeojson.id ?? pkVal,
                properties: { ...(featureGeojson.properties || {}), id: featureGeojson.properties?.id ?? pkVal },
            };
        } else if (featureGeojson.type === 'FeatureCollection' && Array.isArray(featureGeojson.features)) {
            normalizedGeojson = {
                ...featureGeojson,
                features: featureGeojson.features.map(f => ({
                    ...f,
                    id: f.id ?? pkVal,
                    properties: { ...(f.properties || {}), id: f.properties?.id ?? pkVal },
                })),
            };
        } else if (featureGeojson.type && featureGeojson.coordinates) {
            normalizedGeojson = {
                type: 'Feature',
                id: pkVal,
                geometry: featureGeojson,
                properties: { id: pkVal },
            };
        } else {
            return result;
        }

        const foundTypes = new Set();
        if (normalizedGeojson.type === 'Feature') {
            _collectGeometryTypes(normalizedGeojson.geometry, foundTypes);
        } else if (normalizedGeojson.type === 'FeatureCollection') {
            normalizedGeojson.features.forEach(f => _collectGeometryTypes(f.geometry, foundTypes));
        }
        if (foundTypes.size === 0) return result;

        const sourceId = 'detail-object-' + pkVal;
        if (!mapInstance.getSource(sourceId)) {
            mapInstance.addSource(sourceId, {
                type: 'geojson',
                data: normalizedGeojson,
            });
        } else {
            mapInstance.getSource(sourceId).setData(normalizedGeojson);
        }

        const style = objectsLayer.options.style || {};
        const detailStyle = objectsLayer.options.detailStyle || {};
        const isDetailColorExpression = Array.isArray(detailStyle.color);
        const detailColor = isDetailColorExpression
            ? (detailStyle.default_color || '#FF5E00')
            : (detailStyle.color || '#FF5E00');
        const detailRgba = parseColor(detailColor);
        const detailRgbaStr = detailRgba
            ? `rgba(${detailRgba[0]},${detailRgba[1]},${detailRgba[2]},${detailRgba[3]})`
            : detailColor;

        const haloColor = detailStyle.haloColor || '#ffffff';
        const baseWeight = style.weight ?? 5;
        const detailWidth = Math.max(detailStyle.weight ?? 5, baseWeight + 2);
        const detailOpacity = detailStyle.opacity ?? 1.0;
        const detailFillOpacity = detailStyle.fillOpacity ?? Math.min((style.fillOpacity ?? 0.5) + 0.15, 0.75);
        const detailPointRadius = detailStyle.pointRadius ?? detailStyle.radius ?? ((style.pointRadius ?? style.radius ?? 8) + 4);
        const detailPointStrokeWidth = detailStyle.pointWeight ?? Math.max((style.pointWeight ?? 2) + 1, 3);
        const detailPointFillOpacity = detailStyle.pointFillOpacity ?? 0.75;

        // Match visibility of the parent model layer if it was already toggled off
        const existingLayerIds = Object.values(objectsLayer._current_objects || {}).flat();
        const firstExistingLayer = existingLayerIds.find(id => mapInstance.getLayer(id));
        const currentVisibility = firstExistingLayer
            ? (mapInstance.getLayoutProperty(firstExistingLayer, 'visibility') || 'visible')
            : 'visible';

        const addLayerIfMissing = (layerDef) => {
            if (!mapInstance.getLayer(layerDef.id)) {
                mapInstance.addLayer(layerDef);
            }
            result.layerIds.push(layerDef.id);
        };

        if (foundTypes.has('Polygon') || foundTypes.has('MultiPolygon')) {
            const polyFilter = ['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
            ];
            addLayerIfMissing({
                id: `${sourceId}-polygon-fill`,
                type: 'fill',
                source: sourceId,
                filter: polyFilter,
                layout: { visibility: currentVisibility },
                paint: {
                    'fill-color': detailRgbaStr,
                    'fill-opacity': detailFillOpacity,
                }
            });
            addLayerIfMissing({
                id: `${sourceId}-polygon-halo`,
                type: 'line',
                source: sourceId,
                filter: polyFilter,
                layout: { 'line-join': 'round', 'line-cap': 'round', visibility: currentVisibility },
                paint: {
                    'line-color': haloColor,
                    'line-width': detailWidth + 4,
                    'line-opacity': 0.85,
                }
            });
            addLayerIfMissing({
                id: `${sourceId}-polygon-stroke`,
                type: 'line',
                source: sourceId,
                filter: polyFilter,
                layout: { 'line-join': 'round', 'line-cap': 'round', visibility: currentVisibility },
                paint: {
                    'line-color': detailColor,
                    'line-width': detailWidth,
                    'line-opacity': detailOpacity,
                }
            });
        }

        if (foundTypes.has('LineString') || foundTypes.has('MultiLineString')) {
            const lineFilter = ['any',
                ['==', ['geometry-type'], 'LineString'],
                ['==', ['geometry-type'], 'MultiLineString']
            ];
            addLayerIfMissing({
                id: `${sourceId}-line-halo`,
                type: 'line',
                source: sourceId,
                filter: lineFilter,
                layout: { 'line-join': 'round', 'line-cap': 'round', visibility: currentVisibility },
                paint: {
                    'line-color': haloColor,
                    'line-width': detailWidth + 4,
                    'line-opacity': 0.85,
                }
            });
            addLayerIfMissing({
                id: `${sourceId}-lines`,
                type: 'line',
                source: sourceId,
                filter: lineFilter,
                layout: { 'line-join': 'round', 'line-cap': 'round', visibility: currentVisibility },
                paint: {
                    'line-color': detailColor,
                    'line-width': detailWidth,
                    'line-opacity': detailOpacity,
                }
            });
        }

        if (foundTypes.has('Point') || foundTypes.has('MultiPoint')) {
            const pointFilter = ['any',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['geometry-type'], 'MultiPoint']
            ];
            addLayerIfMissing({
                id: `${sourceId}-point-halo`,
                type: 'circle',
                source: sourceId,
                filter: pointFilter,
                layout: { visibility: currentVisibility },
                paint: {
                    'circle-radius': detailPointRadius + 4,
                    'circle-color': haloColor,
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 0,
                }
            });
            addLayerIfMissing({
                id: `${sourceId}-points`,
                type: 'circle',
                source: sourceId,
                filter: pointFilter,
                layout: { visibility: currentVisibility },
                paint: {
                    'circle-radius': detailPointRadius,
                    'circle-color': detailRgbaStr,
                    'circle-opacity': detailPointFillOpacity,
                    'circle-stroke-color': detailColor,
                    'circle-stroke-width': detailPointStrokeWidth,
                    'circle-stroke-opacity': 1.0,
                }
            });
        }

        return result;
    }

    // Earphone for detailed view
    window.addEventListener('entity:map:detail', function(e) {
        const {
            map, objectsLayer, modelname, bounds, layerUrl, tilejsonUrl, layerManager, context,
            hasInitialDetailExtent, detailFeaturePromise
        } = e.detail;
        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Context restoration (view and layers)
        const mapViewContext = getURLParameter("context");
        const hasUrlContext = Boolean(mapViewContext);
        if (mapViewContext) {
            // Unification: store the URL context in localStorage, then restore normally
            mapentityContext.saveContextToLocalStorage(mapViewContext, { prefix: 'detail' });
        }
        mapentityContext.restoreFullContext(map.getMap(), null, {
            prefix: 'detail',
            objectsname: modelname,
            skipMapView: !hasUrlContext && Boolean(hasInitialDetailExtent),
        });

        // Collect secondary geometries for the global fitBounds
        const detailMapEl = document.getElementById('detailmap');
        const extraGeometriesScript = document.getElementById('detailmap-extra-geometries');
        let parsedExtraGeometries = [];
        if (extraGeometriesScript) {
            try {
                parsedExtraGeometries = JSON.parse(extraGeometriesScript.textContent);
            } catch (e) {
                console.warn('MaplibreMapentityMap: failed to parse extra geometries', e);
            }
        }

        const isPrint = Boolean(mapViewContext && mapViewContext.print);

        if (isPrint) {
            const specified = window.SETTINGS.map.styles.print[modelname];
            if (specified) {
                objectsLayer.options.detailStyle = Object.assign({}, objectsLayer.options.detailStyle, specified);
            }
        }

        const pk = document.body.getAttribute('data-pk');
        let pkVal = pk;
        if (pk && /^\d+$/.test(pk)) {
            pkVal = parseInt(pk, 10);
        }

        const mapInstance = map.getMap();
        const featureUrl = detailMapEl ? detailMapEl.getAttribute('data-feature-url') : null;

        // In print/capture mode on detail view, only display the current feature of the active layer
        if (tilejsonUrl && !(isPrint && featureUrl && pkVal)) {
            if (isPrint && pkVal) {
                objectsLayer.loadMVT(tilejsonUrl);
                objectsLayer.updateFromPks([pkVal]);
            } else {
                // Pre-exclude current object before loadMVT so MapLibre builds the initial filter in one pass
                if (featureUrl && pkVal) {
                    objectsLayer.excludedIds.add(pkVal);
                }
                // Load the layer via TileJSON (MVT) with other objects dimmed in detail view
                objectsLayer.loadMVT(tilejsonUrl);
            }
        }

        // Utility function to save extra/detail layers and markers in the current object's group
        const _registerExtrasInGroup = (...results) => {
            const groupKey = objectsLayer.primaryKey;
            const allExtraLayerIds = results.flatMap(r => (r && r.layerIds) ? r.layerIds : []);
            const allExtraMarkers = results.flatMap(r => (r && r.markers) ? r.markers : []);
            if (allExtraLayerIds.length > 0 || allExtraMarkers.length > 0) {
                layerManager.addToGroup(groupKey, allExtraLayerIds, allExtraMarkers);
            }
        };

        // Reuse the prefetched feature GeoJSON if available, otherwise fetch it now
        const featureRequest = detailFeaturePromise || (
            (featureUrl && pkVal)
                ? fetch(featureUrl).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                : null
        );

        if (featureRequest && pkVal) {
            featureRequest
                .then(featureGeojson => {
                    // Display secondary geometries
                    const extraResult = _renderExtraGeometries(mapInstance, parsedExtraGeometries);

                    // Render dedicated foreground layers for the current object
                    const detailObjectResult = _renderDetailObjectLayer(mapInstance, featureGeojson, pkVal, objectsLayer);

                    // If rendering dedicated foreground layers failed, restore the object in MVT and select it
                    if (detailObjectResult.layerIds.length === 0 && tilejsonUrl) {
                        if (isPrint) {
                            objectsLayer.loadMVT(tilejsonUrl);
                            objectsLayer.updateFromPks([pkVal]);
                        } else {
                            objectsLayer.includeFeatures([pkVal]);
                        }
                        objectsLayer.select(pkVal);
                    }

                    // Add green/red markers and directional arrows to the ends of the lines
                    const endpointResult = _addDetailLineEndpointMarkersFromGeojson(mapInstance, featureGeojson, pkVal);

                    // Save layers/markers to the current object group
                    _registerExtrasInGroup(extraResult, detailObjectResult, endpointResult);

                    // Refine bounds only if initial data-mapextent was unavailable or secondary geometries exist
                    if (!hasInitialDetailExtent || parsedExtraGeometries.length > 0) {
                        _fitBoundsFromGeojson(mapInstance, featureGeojson, parsedExtraGeometries);
                    }
                })
                .catch(err => {
                    console.warn('MaplibreMapentityMap: failed to fetch feature geojson', err);
                    if (tilejsonUrl) {
                        if (isPrint) {
                            objectsLayer.loadMVT(tilejsonUrl);
                            objectsLayer.updateFromPks([pkVal]);
                        } else {
                            objectsLayer.includeFeatures([pkVal]);
                        }
                        mapInstance.once('idle', () => objectsLayer.select(pkVal));
                    }
                    const extraResult = _renderExtraGeometries(mapInstance, parsedExtraGeometries);
                    _registerExtrasInGroup(extraResult);
                });
        } else {
            if (tilejsonUrl && pkVal) {
                mapInstance.once('idle', () => objectsLayer.select(pkVal));
            }
            const extraResult = _renderExtraGeometries(mapInstance, parsedExtraGeometries);
            _registerExtrasInGroup(extraResult);
        }

        // Controls
        const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
            () => {
                const context = mapentityContext.getFullContext(map.getMap());
                context['selector'] = '#detailmap';
                return JSON.stringify(context);
            });
        map.getMap().addControl(screenshotControl, 'top-left');

        map.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

        // Save context
        const saveContext = () => {
            if (!layerManager || !layerManager.restoredContext) return;
            mapentityContext.saveFullContext(map.getMap(), {prefix: 'detail'});
        };
        map.getMap().on('moveend', saveContext);
        map.getMap().on('zoomend', saveContext);
        map.getMap().on('layerManager:baseLayerAdded', saveContext);
        map.getMap().on('layerManager:overlayAdded', saveContext);
        map.getMap().on('layerManager:lazyOverlayAdded', saveContext);
        map.getMap().on('layerManager:baseLayerChanged', saveContext);
        map.getMap().on('layerManager:overlayVisibilityChanged', saveContext);
        map.getMap().on('layerManager:lazyLayerVisibilityChanged', saveContext);
        window.addEventListener('visibilitychange', saveContext);
        window.addEventListener('pagehide', saveContext);
    });

    // Listener for the list view
    window.addEventListener('entity:map:list', function(e) {
        const { map, objectsLayer, modelname, bounds, layerUrl, mvtUrl, tilejsonUrl, layerManager, context } = e.detail;

        const mapentityContext = window.MapEntity.currentMap.mapentityContext;

        // Load objects from the backend via TileJSON
        objectsLayer.loadMVT(tilejsonUrl);

        // Controls
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

        // History and filter management
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
        const mapViewContext = getURLParameter("context");
        if (mapViewContext) {
            // Unification : stocker le contexte URL dans le localStorage, puis restaurer normalement
            mapentityContext.saveContextToLocalStorage(mapViewContext, { prefix: 'list' });
        }
        mapentityContext.restoreFullContext(map.getMap(), null, {
            prefix: context.viewname,
            filter: 'mainfilter',
            datatable: window.MapEntity.dt,
            objectsname: context.modelname,
            load_filter_form: window.MapEntity.togglableFilter.load_filter_form.bind(togglableFilter, mapsync)
        }).then(() => {
            mapsync._formSetBounds();
            mapsync._reloadList(true);
        });
    });
});