class MaplibreLayerManager {
    static instance = null;

    constructor() {
        if (MaplibreLayerManager.instance) {
            return MaplibreLayerManager.instance;
        }

        this.layers = {
            baseLayers: {},
            overlays: {},
            lazyOverlays: {}, // New lazy layers
            layerGroups: {} // Mapping ID simple -> liste d'IDs MapLibre
        };
        this.restoredContext = null; // Stockage du contexte restauré
        this._map = null;
        this._eventListeners = [];

        MaplibreLayerManager.instance = this;
    }

    /**
     * Initialise le gestionnaire avec la carte
     * @param map {maplibregl.Map} - Instance de la carte Maplibre
     */
    initialize(map) {
        this._map = map;
    }

    /**
     * Add a layer from a URL (Mapbox Style or TileJSON)
     * @param name {string} - Layer name
     * @param layerConfig {Object} - Configuration (id, url, isBaseLayer, attribution, etc.)
     * @returns {Promise<void>}
     */
    async addLayerFromUrl(name, layerConfig) {
        const { id, url, isBaseLayer = false, attribution = '', opacity = 1 } = layerConfig;

        if (!this._map) {
            console.error('LayerManager not initialized with map');
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            let layerIds = [];

            // Content Type Detection
            if (data.layers && data.sources) {
                // This is a Mapbox Style
                const styleSources = data.sources;
                const styleLayers = data.layers;

                // 1. Add sources
                for (const [sourceId, sourceConfig] of Object.entries(styleSources)) {
                    const newSourceId = `${id}-${sourceId}`;
                    if (!this._map.getSource(newSourceId)) {
                        this._map.addSource(newSourceId, sourceConfig);
                    }
                }

                // 2. Add layers above the base maps but below the data
                const firstDataLayer = this._map.getStyle().layers.find(l => l.id.startsWith('layer-'));
                const beforeId = firstDataLayer ? firstDataLayer.id : undefined;

                for (const layer of styleLayers) {
                    const newLayerId = `${id}-${layer.id}`;
                    if (this._map.getLayer(newLayerId)) continue;

                    const layerCopy = { ...layer, id: newLayerId };
                    if (layer.source) {
                        layerCopy.source = `${id}-${layer.source}`;
                    }
                    
                    // Manage visibility
                    layerCopy.layout = { 
                        ...(layer.layout || {}), 
                        visibility: isBaseLayer ? 'none' : 'none' 
                    };

                    this._map.addLayer(layerCopy, beforeId);
                    layerIds.push(newLayerId);
                }
            } else {
                // This is a TileJSON or a simple source
                const type = data.type || layerConfig.type || 'raster';
                if (!this._map.getSource(id)) {
                    const sourceConfig = {
                        type: type,
                        url: url,
                        attribution: data.attribution || attribution || ''
                    };
                    if (type === 'raster') {
                        sourceConfig.tileSize = layerConfig.tileSize || data.tileSize || 256;
                    }
                    this._map.addSource(id, sourceConfig);
                }

                if (type === 'raster') {
                    if (!this._map.getLayer(id)) {
                        const firstDataLayer = this._map.getStyle().layers.find(l => l.id.startsWith('layer-'));
                        const beforeId = firstDataLayer ? firstDataLayer.id : undefined;

                        this._map.addLayer({
                            id: id,
                            type: 'raster',
                            source: id,
                            layout: { visibility: 'none' },
                            paint: { 'raster-opacity': opacity }
                        }, beforeId);
                        layerIds.push(id);
                    }
                }
            }

            if (layerIds.length > 0) {
                if (isBaseLayer) {
                    this.layers.baseLayers[name] = id;
                    this.layers.layerGroups[id] = layerIds;
                    this._fireEvent('baseLayerAdded', { name, id: id });
                } else {
                    this.layers.layerGroups[id] = layerIds;
                    this.registerOverlay(layerConfig.category || gettext('Overlays'), id, layerIds, name);
                }
            }
        } catch (error) {
            console.error(`Unable to load layer from ${url}:`, error);
        }
    }

    /**
     * Add a base layer
     * @param name {string} - Layer name
     * @param layerConfig {Object} - Layer configuration
     */
    addBaseLayer(name, layerConfig) {
        const { id, tiles, url, tileSize = 256, attribution = '' } = layerConfig;

        if (!this._map) {
            console.error('LayerManager not initialized with map');
            return;
        }

        const sourceConfig = {
            type: 'raster',
            tileSize,
            attribution
        };

        if (url) {
            sourceConfig.url = url;
        } else if (tiles) {
            sourceConfig.tiles = tiles;
        }

        this._map.addSource(id, sourceConfig);

        this._map.addLayer({
            id,
            type: 'raster',
            source: id,
            layout: { visibility: 'none' }
        });

        this.layers.baseLayers[name] = id;
        this._fireEvent('baseLayerAdded', { name, id });
    }

    /**
     * Register a standard overlay layer
     * @param category {string} - Layer category
     * @param primaryKey {string} - Primary key of the object
     * @param layerIds {Array} - MapLibre layer IDs
     * @param labelHTML {string} - Custom HTML label to display
     */
    registerOverlay(category, primaryKey, layerIds, labelHTML) {
        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }

        this.layers.overlays[category][primaryKey] = {
            layerIds,
            labelHTML,
            type: 'loaded' // Couche déjà chargée
        };

        // Register the group so that toggleLayer can resolve primaryKey -> layerIds
        this.layers.layerGroups[primaryKey] = layerIds;

        // Initialize the array of DOM markers associated with the group
        if (!this.layers.groupMarkers) this.layers.groupMarkers = {};
        if (!this.layers.groupMarkers[primaryKey]) this.layers.groupMarkers[primaryKey] = [];

        this._fireEvent('overlayAdded', { category, primaryKey, layerIds, labelHTML, type: 'loaded' });
    }

    /**
     * Add additional layers and markers to an existing overlay group.
     * Used to associate secondary geometries with the same toggle as the current object.
     * @param primaryKey {string} - Primary key of the existing group
     * @param extraLayerIds {Array<string>} - MapLibre layer IDs to add
     * @param extraMarkers {Array<maplibregl.Marker>} - DOM markers to add
     */
    addToGroup(primaryKey, extraLayerIds, extraMarkers) {
        if (!this.layers.layerGroups[primaryKey]) {
            this.layers.layerGroups[primaryKey] = [];
        }
        if (extraLayerIds && extraLayerIds.length > 0) {
            this.layers.layerGroups[primaryKey].push(...extraLayerIds);
        }
        if (!this.layers.groupMarkers) this.layers.groupMarkers = {};
        if (!this.layers.groupMarkers[primaryKey]) this.layers.groupMarkers[primaryKey] = [];
        if (extraMarkers && extraMarkers.length > 0) {
            this.layers.groupMarkers[primaryKey].push(...extraMarkers);
        }
    }

    /**
     * Register a lazy overlay layer (not loaded)
     * @param category {string} - Layer category
     * @param primaryKey {string} - Primary key of the object
     * @param name {string} - Layer name
     * @param dataUrl {string} - Data URL
     * @param labelHTML {string} - Custom HTML label to display
     * @param loadCallback {Function} - Callback to load the layer
     */
    registerLazyOverlay(category, primaryKey, name, dataUrl, labelHTML, loadCallback) {
        if (!this.layers.lazyOverlays[category]) {
            this.layers.lazyOverlays[category] = {};
        }

        this.layers.lazyOverlays[category][primaryKey] = {
            name,
            dataUrl,
            labelHTML,
            loadCallback,
            isLoaded: false,
            isVisible: false,
            type: 'lazy'
        };

        this._fireEvent('lazyOverlayAdded', {
            category,
            primaryKey,
            name,
            dataUrl,
            labelHTML,
            type: 'lazy'
        });
    }

    /**
     * Toggle the visibility of a lazy overlay layer
     * @param category {string} - Layer category
     * @param primaryKey {string} - Primary key of the object
     * @param visible {boolean} - Desired visibility
     * @returns {Promise<boolean>} - Success of the operation
     */
    async toggleLazyOverlay(category, primaryKey, visible) {
        const lazyLayer = this.layers.lazyOverlays[category]?.[primaryKey];

        if (!lazyLayer) {
            console.warn(`Lazy layer not found: ${category}/${primaryKey}`);
            return false;
        }

        try {
            // Call the layer's load callback
            const success = await lazyLayer.loadCallback(primaryKey, visible);
            if (success) {
                lazyLayer.isVisible = visible;
                if (visible) {
                    lazyLayer.isLoaded = true;
                }
            }
            this._fireEvent('lazyLayerVisibilityChanged', { primaryKey, visible });
            return success;
        } catch (error) {
            console.error(`Error toggling lazy layer ${category}:`, error);
            return false;
        }
    }

    /**
     * Notify a loading error to uncheck the box
     * @param primaryKey {string} - Primary key of the layer that failed
     */
    notifyLoadingError(primaryKey) {
        this._fireEvent('loadingError', { primaryKey });
    }

    /**
     * Toggle the visibility of one or more layers
     * @param layerIds {string|Array<string>} - ID(s) of the layers or group ID
     * @param visible {boolean} - Desired visibility
     */
    toggleLayer(layerIds, visible = true) {
        if (!this._map) {
            return;
        }

        let ids = [];
        if (Array.isArray(layerIds)) {
            ids = layerIds;
        } else if (typeof layerIds === 'string') {
            // Check if it's a group ID
            if (this.layers.layerGroups[layerIds]) {
                ids = this.layers.layerGroups[layerIds];
            } else {
                ids = layerIds.split(',').map(id => id.trim());
            }
        }

        for (const id of ids) {
            if (this._map.getLayer(id)) {
                this._map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
            } else if (this.layers.layerGroups[id]) {
                // Recursion if one of the IDs is itself a group (unlikely but robust)
                this.toggleLayer(id, visible);
            } else {
                console.warn(`Layer "${id}" not found.`);
            }
        }

        // Toggle the visibility of DOM markers associated with the group
        if (this.layers.groupMarkers) {
            // Resolve the original primaryKey (layerIds can be a group ID)
            const groupKey = (typeof layerIds === 'string' && this.layers.layerGroups[layerIds]) ? layerIds : null;
            if (groupKey && this.layers.groupMarkers[groupKey]) {
                this.layers.groupMarkers[groupKey].forEach(marker => {
                    const el = marker.getElement();
                    if (el) el.style.display = visible ? '' : 'none';
                });
            }
        }
    }

    /**
     * Get all layers
     * @returns {Object} - Object containing baseLayers, overlays, and lazyOverlays
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Get the map
     * @returns {Object} - Object containing the map
     */
    getMap() {
        return this._map;
    }

    /**
     * Fire an event
     * @param event {string} - Name of the event
     * @param data {Object} - Event data
     * @private
     */
    _fireEvent(event, data) {
        if (this._eventListeners[event]) {
            this._eventListeners[event].forEach(callback => callback(data));
        }

        // Also trigger on the map if available
        if (this._map) {
            this._map.fire(`layerManager:${event}`, data);
        }
    }

    /**
     * Get the singleton instance
     * @returns {MaplibreLayerManager}
     */
    static getInstance() {
        if (!MaplibreLayerManager.instance) {
            new MaplibreLayerManager();
        }
        return MaplibreLayerManager.instance;
    }
}