class MaplibreObjectsLayer {
    /**
     * @param geojson {Object} - GeoJSON Object
     * @param options {Object} - Configuration options
     */
    constructor(geojson, options = {}) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.options = { ...options };
        this.boundsLayer = null;
        this.currentTooltip = null;
        this.currentPopup = null;
        this._track_objects = {};
        this.isLoaded = false; // New state for lazy loading
        this.dataUrl = options.dataUrl; // URL for lazy loading
        this.isLazy = options.isLazy;
        this.loading = false; // Loading state
        this.primaryKey = this.options.primaryKey;
        this.excludedIds = new Set(); // IDs to exclude from display (e.g., currently being edited)

        // Get layer manager
        this.layerManager = MaplibreLayerManager.getInstance();
    }

    /**
     * Initialize the object layer on the map
     * @param map {maplibregl.Map} - Maplibre Map instance
     */
    initialize(map) {
        this._map = map;

        // Initialize the layer manager if not already done
        if (!this.layerManager.getMap()) {
            this.layerManager.initialize(map);
        }

        this._setupGlobalEvents();
    }

    /**
     * Configure global map events (independent of loaded layers)
     * @private
     */
    _setupGlobalEvents() {
        // Exclusion Management (to hide objects being edited)
        this._map.on('mapentity:exclude-features', (e) => {
            if (e.ids && Array.isArray(e.ids)) {
                e.ids.forEach(id => this.excludedIds.add(id));
                this._updateAllLayerFilters();
            }
        });

        this._map.on('mapentity:include-features', (e) => {
            if (e.ids && Array.isArray(e.ids)) {
                e.ids.forEach(id => this.excludedIds.delete(id));
                this._updateAllLayerFilters();
            }
        });
    }

    /**
     * Initialize events listener of the map for specific layers
     */
    setupLayerEvents() {
        const layersNames = this._current_objects[this.primaryKey];

        if (!layersNames) return;

        for (const layer of layersNames){
            const onClick = (e) => this._onClick(e);
            const onMouseMove = (e) => this._onMouseMove(e);
            const onMouseLeave = (e) => this._onMouseLeave(e);
            this._map.on('click', layer, onClick);
            this._map.on('mousemove', layer, onMouseMove);
            this._map.on('mouseleave', layer, onMouseLeave);
        }
    }

    /**
     * Manages the map click event
     * @param e {Object} - Click event
     * @private
     */
    async _onClick(e) {
        if (!this.options.displayPopup) {
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point);
        console.log("Features found on click:", features);

        // Exclude the Geoman features (sources starting with gm_, gm-, geoman_, geoman-)
        const nonGeomanFeatures = features.filter(f => {
            const source = f.source || '';
            return source !== 'geojson' && 
                   !source.startsWith('gm_') && 
                   !source.startsWith('gm-') && 
                   !source.startsWith('geoman_') && 
                   !source.startsWith('geoman-');
        });

        if (nonGeomanFeatures.length > 0) {
            const feature = nonGeomanFeatures[0];

            // Don't show popup for current object
            const currentPk = document.body.dataset.pk;
            if (currentPk) {
                const currentPkStr = String(currentPk);
                const featureIdStr = feature.id != null ? String(feature.id) : null;
                const featurePropIdStr = feature.properties && feature.properties.id != null
                    ? String(feature.properties.id)
                    : null;

                if ((featureIdStr && featureIdStr === currentPkStr) ||
                    (featurePropIdStr && featurePropIdStr === currentPkStr)) {
                    return;
                }
            }

            if (this.options.displayPopup) {
                var popup_content;
                try {
                    popup_content = await this.getPopupContent(this.options.modelname, feature.properties.id);
                } catch (error) {
                    popup_content = gettext('Data unreachable');
                }
                new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popup_content).addTo(this._map);

                if (this.currentPopup) {
                    this.currentPopup.remove();
                    this.currentPopup = null;
                }
            }
        }
    }

    /**
     * Manages mouse movement on the map
     * @param e {Object} - Move event
     * @private
     */
    _onMouseMove(e) {
        if(!this.currentTooltip) {
            const feature = e.features[0];
            if (feature) {
                // Change the cursor style as a UI indicator.
                this._map.getCanvas().style.cursor = 'pointer';

                if(this.options.readonly){
                    return;
                }

                // Don't show tooltip for current object
                const currentPk = document.body.dataset.pk;
                if (currentPk) {
                    const currentPkStr = String(currentPk);
                    const featureIdStr = feature.id != null ? String(feature.id) : null;
                    const featurePropIdStr = feature.properties && feature.properties.id != null
                        ? String(feature.properties.id)
                        : null;

                    if ((featureIdStr && featureIdStr === currentPkStr) ||
                        (featurePropIdStr && featurePropIdStr === currentPkStr)) {
                        return;
                    }
                }

                const name = feature.properties?.name;
                if (!name || String(name).trim() === '') {
                    // No tooltip if the name is missing, empty, or null
                    return;
                }
                const coordinates = e.lngLat;
                const descriptionContent = String(name).trim();
                const description = `<div class="popup-content">${descriptionContent}</div>`;

                this.currentTooltip = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'custom-popup',
                    anchor: 'left',
                    offset: 10,
                });
                this.currentTooltip.setLngLat(coordinates).setHTML(description).addTo(this._map);
            }
        }
    }


    /**
     * Manages the event of the mouse leaving the location of a feature
     * @param e {Object} - Movement event
     * @private
     */
    _onMouseLeave(e) {
        this._map.getCanvas().style.cursor = '';
        if(this.currentTooltip){
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }


    /**
     * Registers a lazy layer (without data) in the manager
     * @param name {string} - Layer name
     * @param category {string} - Layer category
     * @param labelHTML {string} - HTML label for display
     */
    registerLazyLayer(modelname, category, labelHTML, primaryKey, dataUrl) {
        // Register in the manager with a lazy status
        this.layerManager.registerLazyOverlay(
            category,
            primaryKey,
            modelname,
            dataUrl,
            labelHTML,
            (pk, visible) => this.toggleLazyLayer(pk, visible) // Callback for loading
        );
    }

    /**
     * Manages the toggle of a lazy layer (loading + display/hide)
     * @param primaryKey {string} - Layer primary key
     * @param visible {boolean} - Desired visibility
     * @returns {Promise<boolean>} - Load/toggle success
     */
    async toggleLazyLayer(primaryKey, visible = true) {

        this._map.on('layerManager:lazyLayerVisibilityChanged', (event) => {
            visible = event.visible;
            if (!visible && this.isLoaded) {
                const layerIds = this._current_objects[event.primaryKey];
                if (layerIds) {
                    this.layerManager.toggleLayer(layerIds, false);
                }
                return true;
            }
        })

        // If you want to display but not yet loaded, load first
        if (visible && !this.isLoaded) {
            try {
                if (this.options.tilejsonUrl) {
                    this.loadMVT(this.options.tilejsonUrl);
                } else if (this.dataUrl) {
                    await this.load(this.dataUrl);
                } else {
                    return false;
                }
                // After successful loading, display the layer
                const layerIds = this._current_objects[primaryKey];
                if (layerIds) {
                    this.layerManager.toggleLayer(layerIds, true);
                }
                return true;
            } catch (error) {
                console.error(`Failed to load data for ${this.options.name}:`, error);
                // Notify the layer manager of the failure to uncheck the box
                this.layerManager.notifyLoadingError(primaryKey);
                return false;
            }
        }

        // If already loaded, just do the normal toggle
        if (this.isLoaded) {
            const layerIds = this._current_objects[primaryKey];
            if (layerIds) {
                this.layerManager.toggleLayer(layerIds, visible);
                return true;
            }
        }

        return false;
    }

    /**
     * Load data from a URL
     * @param url {string} - GeoJSON data URL
     * @returns {Promise<void>}
     */
    async load(url) {
        if (this.loading) {
            console.warn("Loading in progress...");
            return;
        }
        console.debug("Loading data from URL: " + url);
        this.loading = true;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.isLoaded = true;
            this.addData(data);
        } catch (error) {
            console.error("Could not load url '" + url + "'", error);
            throw error; // Retry so that toggleLazyLayer can handle the error
        }
    }

    /**
     * Loads an MVT layer (Vector Tiles) from a TileJSON URL
     * @param tilejsonUrl {string} - URL of the TileJSON endpoint (e.g.: /api/model/drf/models/tilejson)
     */
    loadMVT(tilejsonUrl) {
        if (!tilejsonUrl) {
            console.warn("TileJSON URL is undefined, falling back to GeoJSON");
            if (this.options.dataUrl) {
                this.load(this.options.dataUrl);
            }
            return;
        }
        if (this.loading) {
            console.warn("Loading already in progress...");
            return;
        }
        console.debug("Loading MVT from TileJSON: " + tilejsonUrl);
        this.loading = true;
        this._isMVT = true;

        const primaryKey = this.primaryKey;
        const sourceId = `source-${primaryKey}`;
        const layerIdBase = `layer-${primaryKey}`;
        const sourceLayer = this.options.modelname;

        // Add the vector-tile source via TileJSON
        this._map.addSource(sourceId, {
            type: 'vector',
            url: window.location.origin + tilejsonUrl,
            promoteId: { [sourceLayer]: 'id' },
        });

        this._mvtSourceLayer = sourceLayer;

        // Styles
        const style = this.options.style;
        const isColorExpression = Array.isArray(style.color);
        const colorForParsing = isColorExpression ? (style.default_color || '#000000') : style.color;
        const rgba = parseColor(colorForParsing);
        const rgbaStr = isColorExpression ? style.color : `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        const fillOpacity = style.fillOpacity ?? 0.7;
        const strokeOpacity = style.opacity ?? 1.0;
        const strokeColor = style.color;
        const strokeWidth = style.weight ?? 5;

        const detailStyle = this.options.detailStyle || {};
        const isDetailColorExpression = Array.isArray(detailStyle.color);
        const detailColorForParsing = isDetailColorExpression ? (detailStyle.default_color || '#FF5E00') : (detailStyle.color || '#FF5E00');
        const detailColor = isDetailColorExpression ? detailStyle.color : (detailStyle.color || '#FF5E00');
        const detailRgba = parseColor(detailColorForParsing);
        const detailRgbaStr = isDetailColorExpression ? detailStyle.color : `rgba(${detailRgba[0]},${detailRgba[1]},${detailRgba[2]},${detailRgba[3]})`;

        const layerIds = [];

        // Add layers for all geometry types (we don't know the types in advance with MVT)
        layerIds.push(this._addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth, detailRgbaStr, detailColor, sourceLayer));
        layerIds.push(this._addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity, detailColor, sourceLayer));
        layerIds.push(...this._addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity, detailRgbaStr, detailColor, sourceLayer));

        // Save layers
        this._current_objects[primaryKey] = layerIds;

        // Store basic geometric filters for each MVT layer
        // to be able to reuse them during filtering by PKs
        this._mvtBaseFilters = {};
        for (const layerId of layerIds) {
            if (this._map.getLayer(layerId)) {
                this._mvtBaseFilters[layerId] = this._map.getFilter(layerId);
            }
        }

        this.isLoaded = true;
        this.loading = false;

        // Register with the layer manager
        if (!this.isLazy) {
            this.layerManager.registerOverlay(this.options.category, primaryKey, layerIds, this.options.nameHTML);
        }

        // Add event listeners on the created layers
        this.setupLayerEvents();
    }

    /**
     * Add GeoJSON data
     * @param geojson {Object} - GeoJSON data
     */
    addData(geojson) {
        const dataId = this.primaryKey;
        this._objects[dataId] = geojson;

        if (geojson.type === "Feature") {
            this.addLayer(geojson, dataId, true, true);
            this.boundsLayer = calculateBounds(geojson);
            if (this.boundsLayer) {
                this._map.fitBounds(this.boundsLayer, {
                    maxZoom: 16,
                    padding: 50,
                    duration: 0,
                    animate: false
                });
            }
        } else {
            this.addLayer(geojson, dataId);
        }
    }

    /**
     * Add a layer to the map
     * @param geojson {Object} - GeoJSON data
     * @param pk {string} - Primary key
     * @param detailStatus {boolean} - Detailed mode
     * @param readonly {boolean} - Read-only mode
     */
    addLayer(geojson, pk, detailStatus = false, readonly = false) {
        const primaryKey = pk;
        const foundTypes = new Set();

        // Analysis of geometry types
        if (geojson.type === "Feature") {
            if (!geojson.id && geojson.properties?.id) {
                geojson.id = geojson.properties.id;
            }
            this._analyzeGeometryTypes(geojson.geometry, foundTypes);
        } else if (geojson.type === "FeatureCollection") {
            geojson.features.forEach(feature => {
                if (!feature.id && feature.properties?.id) {
                    feature.id = feature.properties.id;
                }
                this._analyzeGeometryTypes(feature.geometry, foundTypes);
            });
        }

        const layerIdBase = `layer-${primaryKey}`;
        const sourceId = `source-${primaryKey}`;
        const isReadonly = readonly || this.options.readonly;
        this.options.readonly = isReadonly;

        this._map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
        });

        // Styles
        const style = detailStatus ? this.options.detailStyle : this.options.style;
        const isColorExpression = Array.isArray(style.color);
        const colorForParsing = isColorExpression ? (style.default_color || '#000000') : style.color;
        const rgba = parseColor(colorForParsing);
        const rgbaStr = isColorExpression ? style.color : `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        const fillOpacity = style.fillOpacity ?? 0.7;
        const strokeOpacity = style.opacity ?? 1.0;
        const strokeColor = style.color;
        const strokeWidth = style.weight ?? 5;

        // Detail styles for 'selected' state
        const detailStyle = this.options.detailStyle || {};
        const isDetailColorExpression = Array.isArray(detailStyle.color);
        const detailColorForParsing = isDetailColorExpression ? (detailStyle.default_color || '#FF5E00') : (detailStyle.color || '#FF5E00');
        const detailColor = isDetailColorExpression ? detailStyle.color : (detailStyle.color || '#FF5E00');
        const detailRgba = parseColor(detailColorForParsing);
        const detailRgbaStr = isDetailColorExpression ? detailStyle.color : `rgba(${detailRgba[0]},${detailRgba[1]},${detailRgba[2]},${detailRgba[3]})`;

        const layerIds = [];

        // Add layers according to geometry types
        if (foundTypes.has("Point") || foundTypes.has("MultiPoint")) {
            layerIds.push(this._addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth, detailRgbaStr, detailColor));
        }

        if (foundTypes.has("LineString") || foundTypes.has("MultiLineString")) {
            layerIds.push(this._addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity, detailColor));
            // In detail mode, add green (start) and red (arrival) markers and arrows
            if (detailStatus) {
                this._addLineEndpointMarkers(geojson);
                this._addLineArrowLayer(layerIdBase, sourceId, isColorExpression ? colorForParsing : strokeColor);
            }
        }

        if (foundTypes.has("Polygon") || foundTypes.has("MultiPolygon")) {
            layerIds.push(...this._addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity, detailRgbaStr, detailColor));
        }

        // Save layers
        this._current_objects[primaryKey] = layerIds;

        // Register with the layer manager (only if not already lazy)
        if(this.isLoaded && !this.isLazy) {
            this.layerManager.registerOverlay(this.options.category, primaryKey, layerIds, this.options.nameHTML);
        }

        // Add event listeners on the created layers
        this.setupLayerEvents();
    }

    /**
     * Analyzes geometry types
     * @param geometry {Object} - GeoJSON geometry
     * @param foundTypes {Set} - Set of found types
     * @private
     */
    _analyzeGeometryTypes(geometry, foundTypes) {
        if (!geometry) return;

        if (geometry.type === "GeometryCollection" && geometry.geometries) {
            geometry.geometries.forEach(g => {
                if (g.type) foundTypes.add(g.type);
            });
        } else if (geometry.type) {
            foundTypes.add(geometry.type);
        }
    }

    /**
     * Constructs the complete filter by combining the base filter and exclusions
     * @param baseFilter {Array} - Base filter
     * @returns {Array} - Complete filter
     * @private
     */
    _buildFilter(baseFilter) {
        if (this.excludedIds.size === 0) {
            return baseFilter;
        }

        // Convert all IDs to unique strings to avoid mixed-type and duplicate errors in 'match'
        const excludedIdsStrings = [...new Set(Array.from(this.excludedIds).map(id => String(id)))];

        // Using 'match' with string conversion for robustness
        // Structure: ['match', ['to-string', ['id']], [ids...], false, true]
        const excludeFilter = ['match', ['to-string', ['id']], excludedIdsStrings, false, true];

        if (!baseFilter) {
            return excludeFilter;
        }

        // If the base filter is already 'all', we just add the exclusion
        if (baseFilter[0] === 'all') {
            return [...baseFilter, excludeFilter];
        }

        return ['all', baseFilter, excludeFilter];
    }

    /**
     * Updates the filters of all managed layers to reflect exclusions
     * @private
     */
    _updateAllLayerFilters() {
        Object.values(this._current_objects).flat().forEach(layerId => {
            if (!this._map.getLayer(layerId)) return;

            const currentFilter = this._map.getFilter(layerId);
            let baseFilter = currentFilter;

            // Attempt to recover the base filter (without the previous exclusion)
            if (Array.isArray(currentFilter) && currentFilter[0] === 'all') {
                const last = currentFilter[currentFilter.length - 1];

                // Exclusion clause detection
                // 1. Old format !in
                // 2. Old format simple match
                // 3. New format match with to-string
                const isExcludeFilter = (Array.isArray(last) && last[0] === '!in' && Array.isArray(last[1]) && last[1][1] === 'id') ||
                                        (Array.isArray(last) && last[0] === 'match' && Array.isArray(last[1]) && last[1][1] === 'id') ||
                                        (Array.isArray(last) && last[0] === 'match' && Array.isArray(last[1]) && last[1][0] === 'to-string');

                if (isExcludeFilter) {
                    // We are just removing the last element that matches our exclusion filter
                    baseFilter = currentFilter.slice(0, -1);

                    // If the result is ['all', singleFilter], MapLibre accepts it.
                    // But if baseFilter becomes ['all'], it is invalid.
                    if (baseFilter.length === 1) baseFilter = null;
                }
            }

            const newFilter = this._buildFilter(baseFilter);

            try {
                this._map.setFilter(layerId, newFilter);
            } catch (e) {
                console.warn(`Could not update filter on layer ${layerId}`, e);
            }
        });
    }

    /**
     * Add a layer of points
     * @param layerIdBase {string} - Base layer ID
     * @param sourceId {string} - Source ID
     * @param rgbaStr {string} - RGBA color
     * @param strokeColor {string} - Stroke color
     * @param fillOpacity {number} - Fill opacity
     * @param strokeOpacity {number} - Stroke opacity
     * @param strokeWidth {number} - Stroke width
     * @returns {string} - Created layer ID
     * @private
     */
    _addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth, detailRgbaStr, detailStrokeColor, sourceLayer) {
        const layerId = `${layerIdBase}-points`;
        const hoveredStrokeWidth = strokeWidth + 2;
        const detailStyle = this.options.detailStyle || {};
        const detailStrokeWidth = detailStyle.weight ?? strokeWidth;
        const detailFillOpacity = detailStyle.fillOpacity ?? fillOpacity;
        const detailStrokeOpacity = detailStyle.opacity ?? strokeOpacity;
        const layerDef = {
            id: layerId,
            type: 'circle',
            source: sourceId,
        };
        if (sourceLayer) layerDef['source-layer'] = sourceLayer;
        Object.assign(layerDef, {
            filter: this._buildFilter(['any',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['geometry-type'], 'MultiPoint']
            ]),
            paint: {
                'circle-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailRgbaStr,
                    rgbaStr
                ],
                'circle-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailFillOpacity,
                    fillOpacity
                ],
                'circle-stroke-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeColor,
                    strokeColor
                ],
                'circle-stroke-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeOpacity,
                    strokeOpacity
                ],
                'circle-stroke-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    hoveredStrokeWidth,
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeWidth,
                    strokeWidth
                ],
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    10,
                    8
                ]
            }
        });
        this._map.addLayer(layerDef);
        return layerId;
    }


    /**
     * Add a layer of lines
     * @param layerIdBase {string} - Base layer ID
     * @param sourceId {string} - Source ID
     * @param strokeColor {string} - Line color
     * @param strokeWidth {number} - Line width
     * @param strokeOpacity {number} - Line opacity
     * @returns {string} - Created layer ID
     * @private
     */
    _addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity, detailColor, sourceLayer) {
        const layerId = `${layerIdBase}-lines`;
        // Increase in width on hover (in pixels)
        const hoverExtra = 2;
        const hoveredWidth = strokeWidth + hoverExtra;
        const detailStyle = this.options.detailStyle || {};
        const detailWidth = detailStyle.weight ?? strokeWidth;
        const detailOpacity = detailStyle.opacity ?? strokeOpacity;

        const layerDef = {
            id: layerId,
            type: 'line',
            source: sourceId,
        };
        if (sourceLayer) layerDef['source-layer'] = sourceLayer;
        Object.assign(layerDef, {
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            filter: this._buildFilter(['any',
                ['==', ['geometry-type'], 'LineString'],
                ['==', ['geometry-type'], 'MultiLineString']
            ]),
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailColor,
                    strokeColor
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    hoveredWidth,
                    ['boolean', ['feature-state', 'selected'], false],
                    detailWidth,
                    strokeWidth
                ],
                'line-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailOpacity,
                    strokeOpacity
                ]
            }
        });
        this._map.addLayer(layerDef);
        return layerId;
    }

    /**
     * Add an arrow layer along the lines (detail mode only).
     * @param {string} layerIdBase - Base layer ID
     * @param {string} sourceId - Source ID
     * @param {string} strokeColor - Arrow color
     * @private
     */
    _addLineArrowLayer(layerIdBase, sourceId, strokeColor) {
        const arrowImageId = 'mapentity-arrow';
        const layerId = `${layerIdBase}-arrows`;
        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';

        const addArrowLayer = () => {
            this._map.addLayer({
                id: layerId,
                type: 'symbol',
                source: sourceId,
                filter: ['any',
                    ['==', ['geometry-type'], 'LineString'],
                    ['==', ['geometry-type'], 'MultiLineString']
                ],
                layout: {
                    'symbol-placement': 'line',
                    'symbol-spacing': 100,
                    'icon-image': arrowImageId,
                    'icon-size': 0.7,
                    'icon-allow-overlap': true,
                    'icon-rotation-alignment': 'map',
                },
            });
        };

        if (this._map.hasImage(arrowImageId)) {
            addArrowLayer();
        } else {
            fetch(markersBase + 'arrow.svg')
                .then(r => r.text())
                .then(svgText => {
                    const coloredSvg = svgText.replace('__COLOR__', strokeColor);
                    const img = new Image(20, 20);
                    img.onload = () => {
                        if (!this._map.hasImage(arrowImageId)) {
                            this._map.addImage(arrowImageId, img);
                        }
                        addArrowLayer();
                    };
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(coloredSvg);
                });
        }
    }

    /**
     * Add green (start) and red (end) DOM markers to the ends of the lines.
     * Used in detail mode only.
     * @param {Object} geojson - GeoJSON data (Feature or FeatureCollection)
     * @private
     */
    _addLineEndpointMarkers(geojson) {
        const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
        for (const feature of features) {
            const geom = feature.geometry;
            if (!geom) continue;

            let startCoord = null;
            let endCoord = null;

            if (geom.type === "LineString" && geom.coordinates.length >= 2) {
                startCoord = geom.coordinates[0];
                endCoord = geom.coordinates[geom.coordinates.length - 1];
            } else if (geom.type === "MultiLineString" && geom.coordinates.length > 0) {
                const firstLine = geom.coordinates[0];
                const lastLine = geom.coordinates[geom.coordinates.length - 1];
                if (firstLine && firstLine.length > 0) startCoord = firstLine[0];
                if (lastLine && lastLine.length > 0) endCoord = lastLine[lastLine.length - 1];
            } else {
                continue;
            }

            if (startCoord) this._createEndpointMarker(startCoord, '#28a745');
            if (endCoord) this._createEndpointMarker(endCoord, '#dc3545');
        }
    }

    /**
     * Creates a standard map image marker (pin) at a given position.
     * @param {Array} lngLat - [lng, lat] coordinates
     * @param {string} color - CSS color of the marker
     * @private
     */
    _createEndpointMarker(lngLat, color) {
        const el = document.createElement('div');
        el.style.pointerEvents = 'none';

        const markersBase = (window.SETTINGS ? window.SETTINGS.urls.static : '/static/') + 'mapentity/markers/';
        fetch(markersBase + 'pin.svg')
            .then(r => r.text())
            .then(svg => {
                el.innerHTML = svg.replace('__COLOR__', color);
                new maplibregl.Marker({ element: el, anchor: 'bottom' })
                    .setLngLat(lngLat)
                    .addTo(this._map);
            });
    }

    /**
     * Add polygon layers (fill + outline)
     * @param layerIdBase {string} - Layer ID base
     * @param sourceId {string} - Source ID
     * @param rgbaStr {string} - RGBA color
     * @param strokeColor {string} - Outline color
     * @param fillOpacity {number} - Fill opacity
     * @param strokeWidth {number} - Outline width
     * @param strokeOpacity {number} - Outline opacity
     * @returns {Array<string>} - Created layer IDs
     * @private
     */
    _addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity, detailRgbaStr, detailStrokeColor, sourceLayer) {
        const fillLayerId = `${layerIdBase}-polygon-fill`;
        const strokeLayerId = `${layerIdBase}-polygon-stroke`;

        // Visualizations on hover
        const hoveredStrokeWidth = strokeWidth + 2;
        const hoveredFillOpacity = Math.min((fillOpacity ?? 0.7) + 0.15, 1);
        const detailStyle = this.options.detailStyle || {};
        const detailFillOpacity = detailStyle.fillOpacity ?? fillOpacity;
        const detailStrokeWidth = detailStyle.weight ?? strokeWidth;
        const detailStrokeOpacity = detailStyle.opacity ?? strokeOpacity;

        // Fill layer
        const fillDef = {
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
        };
        if (sourceLayer) fillDef['source-layer'] = sourceLayer;
        Object.assign(fillDef, {
            filter: this._buildFilter(['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
            ]),
            paint: {
                'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailRgbaStr,
                    rgbaStr
                ],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    hoveredFillOpacity,
                    ['boolean', ['feature-state', 'selected'], false],
                    detailFillOpacity,
                    fillOpacity
                ]
            }
        });
        this._map.addLayer(fillDef);

        // Outline layer
        const strokeDef = {
            id: strokeLayerId,
            type: 'line',
            source: sourceId,
        };
        if (sourceLayer) strokeDef['source-layer'] = sourceLayer;
        Object.assign(strokeDef, {
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            filter: this._buildFilter(['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
            ]),
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeColor,
                    strokeColor
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    hoveredStrokeWidth,
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeWidth,
                    strokeWidth
                ],
                'line-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeOpacity,
                    strokeOpacity
                ]
            }
        });
        this._map.addLayer(strokeDef);

        return [fillLayerId, strokeLayerId];
    }

    /**
     * Highlights an object
     * @param primaryKey {string|number} - Primary key
     * @param on {boolean} - Enable/disable
     */
    highlight(primaryKey, on = true) {
        if (this.options.readonly) {
            return;
        }

        const layersBySource = Object.values(this._current_objects).flat();
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;

            if (this._isMVT) {
                const featureState = { source: sourceId, sourceLayer: this._mvtSourceLayer, id: primaryKey };
                this._map.setFeatureState(featureState, { hover: on });
            } else {
                const source = this._map.getSource(sourceId);
                if (!source || !source._data) continue;

                const features = source._data.features || (source._data.geojson && source._data.geojson.features) || [];
                for (const feature of features) {
                    if (!feature.id) continue;
                    const isMatch = feature.id === primaryKey;
                    this._map.setFeatureState(
                        { source: sourceId, id: feature.id },
                        { hover: isMatch && on }
                    );
                }
            }
        }
    }

    /**
     * Select an object
     * @param primaryKey {string|number} - Primary key
     * @param on {boolean} - Enable/disable
     */
    select(primaryKey, on = true) {
        if (this.options.readonly) {
            return;
        }

        const layersBySource = Object.values(this._current_objects).flat();
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);

            if (source && source.type === 'vector' && this._mvtSourceLayer) {
                const featureState = { source: sourceId, sourceLayer: this._mvtSourceLayer, id: primaryKey };
                this._map.setFeatureState(featureState, { selected: on });
            } else if (source && source.type === 'geojson') {
                if (!source._data) continue;

                const features = source._data.features || (source._data.geojson && source._data.geojson.features) || [];
                for (const feature of features) {
                    if (!feature.id) continue;
                    const isMatch = feature.id === primaryKey;
                    if (isMatch) {
                        this._map.setFeatureState(
                            { source: sourceId, id: feature.id },
                            { selected: on }
                        );
                    }
                }
            }
        }
    }

    /**
     * Updates displayed objects
     * @param primaryKeys {Array<string|number>} - Primary keys to display
     */
    updateFromPks(primaryKeys) {
        // MVT Mode: use filters on layers
        if (this._isMVT) {
            const layersBySource = Object.values(this._current_objects).flat();
            // Convert PKs to numbers to match the MVT property type
            const numericPks = primaryKeys.map(pk => Number(pk));
            const pkFilter = numericPks.length > 0
                ? ['in', ['get', 'id'], ['literal', numericPks]]
                : ['==', ['get', 'id'], -1];

            for (const layerId of layersBySource) {
                if (!this._map.getLayer(layerId)) continue;
                // Retrieve the base geometric filter (stored during creation)
                const baseGeomFilter = this._mvtBaseFilters && this._mvtBaseFilters[layerId];
                const newFilter = baseGeomFilter
                    ? ['all', baseGeomFilter, pkFilter]
                    : pkFilter;
                this._map.setFilter(layerId, this._buildFilter(newFilter));
            }
            return;
        }

        if (!this._track_objects) {
            this._track_objects = {};
        }

        let sourceId = null;
        let fullFeatureCollection = null;
        const layersBySource = Object.values(this._current_objects).flat();

        if (layersBySource.length === 0) {
            console.error("No layer found in _current_objects");
            return;
        }

        // Trouver la source
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const currentSourceId = layer.source;
            const source = this._map.getSource(currentSourceId);
            if (source && source._data) {
                const fc = source._data.features ? source._data : (source._data.geojson || null);
                if (fc && fc.features) {
                    sourceId = currentSourceId;
                    fullFeatureCollection = fc;
                    break;
                }
            }
        }

        if (!sourceId || !fullFeatureCollection) {
            console.warn('No valid source found');
            return;
        }

        const source = this._map.getSource(sourceId);

        // Save features
        fullFeatureCollection.features.forEach(feature => {
            const featureId = feature.properties?.id;
            if (featureId && !this._track_objects[featureId]) {
                this._track_objects[featureId] = { ...feature };
            }
        });

        // Filter features to display
        const featuresToShow = primaryKeys
            .map(pk => this._track_objects[pk])
            .filter(feature => feature);

        // Update source
        source.setData({
            type: 'FeatureCollection',
            features: featuresToShow
        });
    }

    /**
     * Move the view to an object
     * @param pk {string|number} - Primary key
     */
    jumpTo(pk) {
        let feature = null;
        const layersBySource = Object.values(this._current_objects).flat();

        if (this._isMVT) {
            // In MVT mode, use querySourceFeatures to find the feature
            for (const layerId of layersBySource) {
                const layer = this._map.getLayer(layerId);
                if (!layer) continue;

                const features = this._map.querySourceFeatures(layer.source, {
                    sourceLayer: this._mvtSourceLayer,
                    filter: ['==', ['get', 'id'], pk]
                });
                if (features.length > 0) {
                    feature = features[0];
                    break;
                }
            }
        } else {
            for (const layerId of layersBySource) {
                const layer = this._map.getLayer(layerId);
                if (!layer) continue;

                const source = this._map.getSource(layer.source);
                if (source && source._data && source._data.geojson.features) {
                    const foundFeature = source._data.geojson.features.find(f => f.properties?.id === pk);
                    if (foundFeature) {
                        feature = foundFeature;
                        break;
                    }
                }
            }
        }

        if (!feature) {
            console.warn(`Feature with id ${pk} not found`);
            return;
        }

        const bounds = calculateBounds(feature);
        if (bounds) {
            this._map.fitBounds(bounds, { padding: 20, maxZoom: 16, animate: false });
        }
    }

    /**
     * Retrieves an object by its key
     * @param primaryKey {string|number} - Primary key
     * @returns {Object}
     */
    getLayer(primaryKey) {
        return this._objects[primaryKey];
    }

    /**
     * Get the boundaries layer
     * @returns {*}
     */
    getBoundsLayer() {
        return this.boundsLayer;
    }

    /**
     * Fetch data to display in object popup
     * @returns {Promise<String>}
     */
    async getPopupContent(modelname, id){
        const popup_url = window.SETTINGS.urls.popup.replace(new RegExp('modelname', 'g'), modelname)
                                          .replace('0', id);

        // fetch data
        var response = await window.fetch(popup_url);
        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        } else {
            // parse data
            try {
                const data = await response.json();
                return data;
            } catch (error) {
                throw new Error('Cannot parse data');
            }
        }
    }
}