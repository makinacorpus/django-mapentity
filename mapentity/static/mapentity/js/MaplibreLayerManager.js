class MaplibreLayerManager {
    static instance = null;

    constructor() {
        if (MaplibreLayerManager.instance) {
            return MaplibreLayerManager.instance;
        }

        this.layers = {
            baseLayers: {},
            overlays: {},
            lazyOverlays: {} // Nouvelles couches lazy
        };
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
     * Ajoute une couche de base
     * @param name {string} - Nom de la couche
     * @param layerConfig {Object} - Configuration de la couche
     */
    addBaseLayer(name, layerConfig) {
        const { id, tiles, tileSize = 256, attribution = '' } = layerConfig;

        if (!this._map) {
            console.error('LayerManager not initialized with map');
            return;
        }

        this._map.addSource(id, {
            type: 'raster',
            tiles: tiles,
            tileSize,
            attribution
        });

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
            console.error(`Erreur lors du toggle de la couche lazy ${primaryKey}:`, error);
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
     * @param layerIds {string|Array<string>} - ID(s) des couches
     * @param visible {boolean} - Visibilité souhaitée
     */
    toggleLayer(layerIds, visible = true) {
        if (!this._map) {
            return;
        }

        const ids = Array.isArray(layerIds)
            ? layerIds
            : typeof layerIds === 'string'
                ? layerIds.split(',').map(id => id.trim())
                : [];

        for (const id of ids) {
            if (this._map.getLayer(id)) {
                this._map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
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