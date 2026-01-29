class MaplibreObjectsLayer {
    /**
     * @param geojson {Object} - Objet GeoJSON
     * @param options {Object} - Options de configuration
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
        this.isLoaded = false; // Nouvel état pour le lazy loading
        this.dataUrl = options.dataUrl; // URL pour le lazy loading
        this.isLazy = options.isLazy;
        this.loading = false; // État de chargement
        this.primaryKey = this.options.primaryKey;
        this.excludedIds = new Set(); // IDs à exclure de l'affichage (ex: en cours d'édition)

        // Récupérer le gestionnaire de couches
        this.layerManager = MaplibreLayerManager.getInstance();
    }

    /**
     * Initialise la couche d'objets sur la carte
     * @param map {maplibregl.Map} - Instance de la carte Maplibre
     */
    initialize(map) {
        this._map = map;

        // Initialiser le gestionnaire de couches s'il ne l'est pas déjà
        if (!this.layerManager.getMap()) {
            this.layerManager.initialize(map);
        }

        this._setupGlobalEvents();
    }

    /**
     * Configure les événements globaux de la carte (indépendants des couches chargées)
     * @private
     */
    _setupGlobalEvents() {
        // Gestion des exclusions (pour masquer les objets en cours d'édition)
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
     * Gère l'événement de clic sur la carte
     * @param e {Object} - Événement de clic
     * @private
     */
    async _onClick(e) {
        if (!this.options.displayPopup) {
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point);
        console.log("Features found on click:", features);

        // Exclure les features Geoman (sources commençant par gm_, gm-, geoman_, geoman-)
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
            if (currentPk && (feature.id == currentPk || feature.properties.id == currentPk)) {
                return;
            }

            if (this.options.displayPopup) {
                var popup_content;
                try {
                    popup_content = await this.getPopupContent(this.options.modelname, feature.id);
                } catch (error) {
                    popup_content = gettext('Data unreachable');
                }
                new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popup_content).addTo(this._map);
                e.stopPropagation();

                if (this.currentPopup) {
                    this.currentPopup.remove();
                    this.currentPopup = null;
                }
            }
        }
    }

    /**
     * Gère le mouvement de la souris sur la carte
     * @param e {Object} - Événement de mouvement
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

                const coordinates = e.lngLat;
                const descriptionContent = feature.properties.name || 'No data available';
                const description = `<div class="popup-content">${descriptionContent}</div>`;

                this.currentTooltip = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    className: 'custom-popup',
                    anchor: 'left',
                    offset: 10,
                })
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(this._map);
            }
        }
    }


    /**
     * Gère l'évènement de la sortie de la souris de l'emplacement d'une feature
     * @param e {Object} - Événement de mouvement
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
     * Enregistre une couche lazy (sans données) dans le gestionnaire
     * @param name {string} - Nom de la couche
     * @param category {string} - Catégorie de la couche
     * @param labelHTML {string} - Label HTML pour l'affichage
     */
    registerLazyLayer(modelname, category, labelHTML, primaryKey, dataUrl) {
        // Enregistrer dans le gestionnaire avec un statut lazy
        this.layerManager.registerLazyOverlay(
            category,
            primaryKey,
            modelname,
            dataUrl,
            labelHTML,
            () => this.toggleLazyLayer(primaryKey) // Callback pour le chargement
        );
    }

    /**
     * Gère le toggle d'une couche lazy (chargement + affichage/masquage)
     * @param primaryKey {string} - Clé primaire de la couche
     * @param visible {boolean} - Visibilité souhaitée
     * @returns {Promise<boolean>} - Succès du chargement/toggle
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

        // Si on veut afficher mais pas encore chargé, charger d'abord
        if (visible && !this.isLoaded && this.dataUrl) {
            try {
                await this.load(this.dataUrl);
                // Après chargement réussi, afficher la couche
                const layerIds = this._current_objects[primaryKey];
                if (layerIds) {
                    this.layerManager.toggleLayer(layerIds, true);
                }
                return true;
            } catch (error) {
                console.error(`Impossible de charger les données pour ${this.options.name}:`, error);
                // Notifier l'échec au gestionnaire de couches pour décocher la case
                this.layerManager.notifyLoadingError(primaryKey);
                return false;
            }
        }

        // Si déjà chargé, juste faire le toggle normal
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
     * Charge des données depuis une URL
     * @param url {string} - URL des données GeoJSON
     * @returns {Promise<void>}
     */
    async load(url) {
        if (this.loading) {
            console.warn("Chargement déjà en cours...");
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
            throw error; // Re-lancer pour que toggleLazyLayer puisse gérer l'erreur
        }
    }

    /**
     * Ajoute des données GeoJSON
     * @param geojson {Object} - Données GeoJSON
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
                    duration: 0
                });
            }
        } else {
            this.addLayer(geojson, dataId);
        }
    }

    /**
     * Ajoute une couche à la carte
     * @param geojson {Object} - Données GeoJSON
     * @param pk {string} - Clé primaire
     * @param detailStatus {boolean} - Mode détaillé
     * @param readonly {boolean} - Mode lecture seule
     */
    addLayer(geojson, pk, detailStatus = false, readonly = false) {
        const primaryKey = pk;
        const foundTypes = new Set();

        // Analyse des types de géométrie
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
        const isReadonly = readonly || this.options.readonly; // peut être idéal pour la suite
        this.options.readonly = isReadonly;

        // Ajouter la source
        this._map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
        });

        // Styles
        const style = detailStatus ? this.options.detailStyle : this.options.style;
        const rgba = parseColor(style.color);
        const rgbaStr = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        const fillOpacity = style.fillOpacity ?? 0.7;
        const strokeOpacity = style.opacity ?? 1.0;
        const strokeColor = style.color;
        const strokeWidth = style.weight ?? 5;

        // Detail styles for 'selected' state
        const detailStyle = this.options.detailStyle || {};
        const detailColor = detailStyle.color || '#FF5E00';
        const detailRgba = parseColor(detailColor);
        const detailRgbaStr = `rgba(${detailRgba[0]},${detailRgba[1]},${detailRgba[2]},${detailRgba[3]})`;

        const layerIds = [];

        // Ajouter les couches selon les types de géométrie
        if (foundTypes.has("Point") || foundTypes.has("MultiPoint")) {
            layerIds.push(this._addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth, detailRgbaStr, detailColor));
        }

        if (foundTypes.has("LineString") || foundTypes.has("MultiLineString")) {
            layerIds.push(this._addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity, detailColor));
        }

        if (foundTypes.has("Polygon") || foundTypes.has("MultiPolygon")) {
            layerIds.push(...this._addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity, detailRgbaStr, detailColor));
        }

        // Enregistrer les couches
        this._current_objects[primaryKey] = layerIds;

        // Enregistrer auprès du gestionnaire de couches (seulement si pas déjà lazy)
        if(this.isLoaded && !this.isLazy) {
            this.layerManager.registerOverlay(this.options.category, primaryKey, layerIds, this.options.nameHTML);
        }

        // Add event listeners on the created layers
        this.setupLayerEvents();
    }

    /**
     * Analyse les types de géométrie
     * @param geometry {Object} - Géométrie GeoJSON
     * @param foundTypes {Set} - Set des types trouvés
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
     * Construit le filtre complet en combinant le filtre de base et les exclusions
     * @param baseFilter {Array} - Filtre de base
     * @returns {Array} - Filtre complet
     * @private
     */
    _buildFilter(baseFilter) {
        if (this.excludedIds.size === 0) {
            return baseFilter;
        }

        // Convertir tous les IDs en chaînes uniques pour éviter les erreurs de type mixte et de doublons dans 'match'
        const excludedIdsStrings = [...new Set(Array.from(this.excludedIds).map(id => String(id)))];

        // Utilisation de 'match' avec conversion en chaîne pour robustesse
        // Structure : ['match', ['to-string', ['id']], [ids...], false, true]
        const excludeFilter = ['match', ['to-string', ['id']], excludedIdsStrings, false, true];

        if (!baseFilter) {
            return excludeFilter;
        }

        // Si le filtre de base est déjà un 'all', on ajoute juste l'exclusion
        if (baseFilter[0] === 'all') {
            return [...baseFilter, excludeFilter];
        }

        return ['all', baseFilter, excludeFilter];
    }

    /**
     * Met à jour les filtres de tous les calques gérés pour refléter les exclusions
     * @private
     */
    _updateAllLayerFilters() {
        Object.values(this._current_objects).flat().forEach(layerId => {
            if (!this._map.getLayer(layerId)) return;

            const currentFilter = this._map.getFilter(layerId);
            let baseFilter = currentFilter;

            // Tentative de récupération du filtre de base (sans l'exclusion précédente)
            if (Array.isArray(currentFilter) && currentFilter[0] === 'all') {
                const last = currentFilter[currentFilter.length - 1];

                // Détection de notre clause d'exclusion
                // 1. Ancien format !in
                // 2. Ancien format match simple
                // 3. Nouveau format match avec to-string
                const isExcludeFilter = (Array.isArray(last) && last[0] === '!in' && Array.isArray(last[1]) && last[1][1] === 'id') ||
                                        (Array.isArray(last) && last[0] === 'match' && Array.isArray(last[1]) && last[1][1] === 'id') ||
                                        (Array.isArray(last) && last[0] === 'match' && Array.isArray(last[1]) && last[1][0] === 'to-string');

                if (isExcludeFilter) {
                    // On enlève juste le dernier élément qui correspond à notre filtre d'exclusion
                    baseFilter = currentFilter.slice(0, -1);

                    // Si le résultat est ['all', singleFilter], MapLibre l'accepte.
                    // Mais si baseFilter devient ['all'], c'est invalide.
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
     * Ajoute une couche de points
     * @param layerIdBase {string} - Base de l'ID de couche
     * @param sourceId {string} - ID de la source
     * @param rgbaStr {string} - Couleur RGBA
     * @param strokeColor {string} - Couleur de contour
     * @param fillOpacity {number} - Opacité de remplissage
     * @param strokeOpacity {number} - Opacité de contour
     * @param strokeWidth {number} - Largeur de contour
     * @returns {string} - ID de la couche créée
     * @private
     */
    _addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth, detailRgbaStr, detailStrokeColor) {
        const layerId = `${layerIdBase}-points`;
        this._map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
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
                'circle-opacity': fillOpacity,
                'circle-stroke-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    ['boolean', ['feature-state', 'selected'], false],
                    detailStrokeColor,
                    strokeColor
                ],
                'circle-stroke-opacity': strokeOpacity,
                'circle-stroke-width': strokeWidth,
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    10,
                    8
                ]
            }
        });
        return layerId;
    }

    /**
     * Ajoute une couche de lignes
     * @param layerIdBase {string} - Base de l'ID de couche
     * @param sourceId {string} - ID de la source
     * @param strokeColor {string} - Couleur de ligne
     * @param strokeWidth {number} - Largeur de ligne
     * @param strokeOpacity {number} - Opacité de ligne
     * @returns {string} - ID de la couche créée
     * @private
     */
    _addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity, detailColor) {
        const layerId = `${layerIdBase}-lines`;
        this._map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
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
                'line-width': strokeWidth,
                'line-opacity': strokeOpacity
            }
        });
        return layerId;
    }

    /**
     * Ajoute les couches de polygones (remplissage + contour)
     * @param layerIdBase {string} - Base de l'ID de couche
     * @param sourceId {string} - ID de la source
     * @param rgbaStr {string} - Couleur RGBA
     * @param strokeColor {string} - Couleur de contour
     * @param fillOpacity {number} - Opacité de remplissage
     * @param strokeWidth {number} - Largeur de contour
     * @param strokeOpacity {number} - Opacité de contour
     * @returns {Array<string>} - IDs des couches créées
     * @private
     */
    _addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity, detailRgbaStr, detailStrokeColor) {
        const fillLayerId = `${layerIdBase}-polygon-fill`;
        const strokeLayerId = `${layerIdBase}-polygon-stroke`;

        // Couche de remplissage
        this._map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
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
                'fill-opacity': fillOpacity
            }
        });

        // Couche de contour
        this._map.addLayer({
            id: strokeLayerId,
            type: 'line',
            source: sourceId,
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
                'line-width': strokeWidth,
                'line-opacity': strokeOpacity
            }
        });

        return [fillLayerId, strokeLayerId];
    }

    /**
     * Met en surbrillance un objet
     * @param primaryKey {string|number} - Clé primaire
     * @param on {boolean} - Activer/désactiver
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
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) continue;

            for (const feature of source._data.geojson.features) {
                if (!feature.id) continue;
                const isMatch = feature.id === primaryKey;
                this._map.setFeatureState(
                    { source: sourceId, id: feature.id },
                    { hover: isMatch && on }
                );
            }
        }
    }

    /**
     * Sélectionne un objet
     * @param primaryKey {string|number} - Clé primaire
     * @param on {boolean} - Activer/désactiver
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
            if (!source || !source._data) continue;

            for (const feature of source._data.geojson.features) {
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

    /**
     * Met à jour les objets affichés
     * @param primaryKeys {Array<string|number>} - Clés primaires à afficher
     */
    updateFromPks(primaryKeys) {
        if (!this._track_objects) {
            this._track_objects = {};
        }

        let sourceId = null;
        let fullFeatureCollection = null;
        const layersBySource = Object.values(this._current_objects).flat();

        if (layersBySource.length === 0) {
            console.error("Aucun layer trouvé dans _current_objects");
            return;
        }

        // Trouver la source
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const currentSourceId = layer.source;
            const source = this._map.getSource(currentSourceId);
            if (source && source._data && source._data.geojson.features) {
                sourceId = currentSourceId;
                fullFeatureCollection = source._data.geojson;
                break;
            }
        }

        if (!sourceId || !fullFeatureCollection) {
            console.warn('Aucune source valide trouvée');
            return;
        }

        const source = this._map.getSource(sourceId);

        // Sauvegarder les features
        fullFeatureCollection.features.forEach(feature => {
            const featureId = feature.properties?.id;
            if (featureId && !this._track_objects[featureId]) {
                this._track_objects[featureId] = { ...feature };
            }
        });

        // Filtrer les features à afficher
        const featuresToShow = primaryKeys
            .map(pk => this._track_objects[pk])
            .filter(feature => feature);

        // Mettre à jour la source
        source.setData({
            type: 'FeatureCollection',
            features: featuresToShow
        });
    }

    /**
     * Déplace la vue vers un objet
     * @param pk {string|number} - Clé primaire
     */
    jumpTo(pk) {
        let feature = null;
        const layersBySource = Object.values(this._current_objects).flat();

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

        if (!feature) {
            console.warn(`Feature avec l'id ${pk} non trouvée`);
            return;
        }

        const bounds = calculateBounds(feature);
        if (bounds) {
            this._map.fitBounds(bounds, { padding: 20, maxZoom: 16 });
        }
    }

    /**
     * Récupère un objet par sa clé
     * @param primaryKey {string|number} - Clé primaire
     * @returns {Object}
     */
    getLayer(primaryKey) {
        return this._objects[primaryKey];
    }

    /**
     * Récupère la couche des limites
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