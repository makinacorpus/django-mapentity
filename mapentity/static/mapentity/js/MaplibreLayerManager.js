class MaplibreLayerManager {
    static instance = null;

    constructor() {
        if (MaplibreLayerManager.instance) {
            return MaplibreLayerManager.instance;
        }

        this.layers = {
            baseLayers: {},
            overlays: {}
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
     * Enregistre une couche overlay
     * @param category {string} - Catégorie de la couche (modelname)
     * @param primaryKey {string} - Clé primaire de l'objet
     * @param layerIds {Array} - IDs des couches MapLibre
     */
    registerOverlay(category, primaryKey, layerIds) {
        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }

        this.layers.overlays[category][primaryKey] = layerIds;
        this._fireEvent('overlayAdded', { category, primaryKey, layerIds });
    }

    /**
     * Bascule la visibilité d'une ou plusieurs couches
     * @param layerIds {string|Array<string>} - ID(s) des couches
     * @param visible {boolean} - Visibilité souhaitée
     */
    toggleLayer(layerIds, visible = true) {
        if (!this._map) return;

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
     * @returns {Object} - Objet contenant baseLayers et overlays
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Ajoute un écouteur d'événement
     * @param event {string} - Nom de l'événement
     * @param callback {Function} - Fonction de rappel
     */
    on(event, callback) {
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(callback);
    }

    /**
     * Supprime un écouteur d'événement
     * @param event {string} - Nom de l'événement
     * @param callback {Function} - Fonction de rappel
     */
    off(event, callback) {
        if (this._eventListeners[event]) {
            this._eventListeners[event] = this._eventListeners[event].filter(cb => cb !== callback);
        }
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