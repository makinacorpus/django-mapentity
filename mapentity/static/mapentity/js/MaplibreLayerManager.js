class MaplibreLayerManager {
    static instance = null;

    constructor() {
        if (MaplibreLayerManager.instance) {
            return MaplibreLayerManager.instance;
        }

        this.layers = {
            baseLayers: {},
            overlays: {},
            lazyOverlays: {}, // Nouvelles couches lazy
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
     * Ajoute une couche à partir d'une URL (Style Mapbox ou TileJSON)
     * @param name {string} - Nom de la couche
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

            // Détection du type de contenu
            if (data.layers && data.sources) {
                // C'est un Style Mapbox
                const styleSources = data.sources;
                const styleLayers = data.layers;

                // 1. Ajouter les sources
                for (const [sourceId, sourceConfig] of Object.entries(styleSources)) {
                    const newSourceId = `${id}-${sourceId}`;
                    if (!this._map.getSource(newSourceId)) {
                        this._map.addSource(newSourceId, sourceConfig);
                    }
                }

                // 2. Ajouter les couches au-dessus des fonds de plan mais sous les données
                const firstDataLayer = this._map.getStyle().layers.find(l => l.id.startsWith('layer-'));
                const beforeId = firstDataLayer ? firstDataLayer.id : undefined;

                for (const layer of styleLayers) {
                    const newLayerId = `${id}-${layer.id}`;
                    if (this._map.getLayer(newLayerId)) continue;

                    const layerCopy = { ...layer, id: newLayerId };
                    if (layer.source) {
                        layerCopy.source = `${id}-${layer.source}`;
                    }
                    
                    // Gérer la visibilité
                    layerCopy.layout = { 
                        ...(layer.layout || {}), 
                        visibility: isBaseLayer ? 'none' : 'none' 
                    };

                    this._map.addLayer(layerCopy, beforeId);
                    layerIds.push(newLayerId);
                }
            } else {
                // C'est un TileJSON ou une source simple
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
            console.error(`Impossible de charger la couche depuis ${url}:`, error);
        }
    }

    /**
     * Ajoute une couche de base
     * @param name {string} - Nom de la couche
     * @param layerConfig {Object} - Configuration de la couche
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
     * Enregistre une couche overlay classique
     * @param category {string} - Catégorie de la couche
     * @param primaryKey {string} - Clé primaire de l'objet
     * @param layerIds {Array} - IDs des couches MapLibre
     * @param labelHTML {string} - Label HTML personnalisé à afficher
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

        // Enregistrer le groupe pour que toggleLayer puisse résoudre primaryKey -> layerIds
        this.layers.layerGroups[primaryKey] = layerIds;

        this._fireEvent('overlayAdded', { category, primaryKey, layerIds, labelHTML, type: 'loaded' });
    }

    /**
     * Enregistre une couche overlay lazy (non chargée)
     * @param category {string} - Catégorie de la couche
     * @param primaryKey {string} - Clé primaire de l'objet
     * @param name {string} - Nom de la couche
     * @param dataUrl {string} - URL des données
     * @param labelHTML {string} - Label HTML personnalisé à afficher
     * @param loadCallback {Function} - Callback pour charger la couche
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
     * Gère le toggle d'une couche lazy
     * @param category {string} - Catégorie
     * @param primaryKey {string} - Clé primaire
     * @param visible {boolean} - Visibilité souhaitée
     * @returns {Promise<boolean>} - Succès de l'opération
     */
    async toggleLazyOverlay(category, primaryKey, visible) {
        const lazyLayer = this.layers.lazyOverlays[category]?.[primaryKey];

        if (!lazyLayer) {
            console.warn(`Couche lazy introuvable: ${category}/${primaryKey}`);
            return false;
        }

        try {
            // Appeler le callback de chargement de la couche
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
            console.error(`Erreur lors du toggle de la couche lazy ${category}:`, error);
            return false;
        }
    }

    /**
     * Notifie une erreur de chargement pour décocher la case
     * @param primaryKey {string} - Clé primaire de la couche qui a échoué
     */
    notifyLoadingError(primaryKey) {
        this._fireEvent('loadingError', { primaryKey });
    }

    /**
     * Bascule la visibilité d'une ou plusieurs couches
     * @param layerIds {string|Array<string>} - ID(s) des couches ou ID de groupe
     * @param visible {boolean} - Visibilité souhaitée
     */
    toggleLayer(layerIds, visible = true) {
        if (!this._map) {
            return;
        }

        let ids = [];
        if (Array.isArray(layerIds)) {
            ids = layerIds;
        } else if (typeof layerIds === 'string') {
            // Vérifier si c'est un ID de groupe
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
                // Récursion si un des IDs est lui-même un groupe (peu probable mais robuste)
                this.toggleLayer(id, visible);
            } else {
                console.warn(`Layer "${id}" not found.`);
            }
        }
    }

    /**
     * Récupère toutes les couches
     * @returns {Object} - Objet contenant baseLayers, overlays et lazyOverlays
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Récupère la map
     * @returns {Object} - Objet contenant la carte
     */
    getMap() {
        return this._map;
    }

    /**
     * Déclenche un événement
     * @param event {string} - Nom de l'événement
     * @param data {Object} - Données de l'événement
     * @private
     */
    _fireEvent(event, data) {
        if (this._eventListeners[event]) {
            this._eventListeners[event].forEach(callback => callback(data));
        }

        // Aussi déclencher sur la carte si disponible
        if (this._map) {
            this._map.fire(`layerManager:${event}`, data);
        }
    }

    /**
     * Récupère l'instance singleton
     * @returns {MaplibreLayerManager}
     */
    static getInstance() {
        if (!MaplibreLayerManager.instance) {
            new MaplibreLayerManager();
        }
        return MaplibreLayerManager.instance;
    }
}