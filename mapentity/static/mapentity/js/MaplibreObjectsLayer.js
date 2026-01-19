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
        this.currentPopup = null;
        this._track_objects = {};
        this.isLoaded = false; // Nouvel état pour le lazy loading
        this.dataUrl = options.dataUrl; // URL pour le lazy loading
        this.isLazy = options.isLazy;
        this.loading = false; // État de chargement
        this.primaryKey = this.options.primaryKey;

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

        const onClick = (e) => this._onClick(e);
        const onMouseMove = (e) => this._onMouseMove(e);
        this._map.on('click', onClick);
        this._map.on('mousemove', onMouseMove);
    }

    /**
     * Gère l'événement de clic sur la carte
     * @param e {Object} - Événement de clic
     * @private
     */
    async _onClick(e) {
        if (this.options.readonly) {
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point);
        console.log("Features found on click:", features);

        if (features.length > 0 && features[0].source !== 'geojson') {
            const feature = features[0];
            if(this.options.displayPopup){
                var popup_content;
                try{
                    popup_content =  await this.getPopupContent(this.options.modelname, feature.id);
                } catch (error) {
                    popup_content = gettext('Data unreachable');
                }
                new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popup_content).addTo(this._map);
            }
        }
    }

    /**
     * Gère le mouvement de la souris sur la carte
     * @param e {Object} - Événement de mouvement
     * @private
     */
    _onMouseMove(e) {
        if (this.options.readonly) {
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point);
        const hoveredFeature = features[0];
        let hoveredFeatureId = null;

        if (hoveredFeature) {
            hoveredFeatureId = hoveredFeature.id || hoveredFeature.properties?.id;
            this._map.getCanvas().style.cursor = 'pointer';
        } else {
            this._map.getCanvas().style.cursor = '';
        }

        // Reset hover state
        const layers = Object.values(this._current_objects).flat();
        for (const layerId of layers) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) continue;

            for (const feature of source._data.geojson.features) {
                if (!feature.id) continue;
                const isHovered = feature.id === hoveredFeatureId;
                this._map.setFeatureState(
                    { source: sourceId, id: feature.id },
                    { hover: isHovered }
                );
            }
        }

        // Gestion du popup
        if (hoveredFeatureId) {
            if (this.currentPopup) {
                this.currentPopup.remove();
                this.currentPopup = null;
            }

            const coordinates = hoveredFeature.geometry.type === 'Point'
                ? hoveredFeature.geometry.coordinates
                : turf.centroid(hoveredFeature).geometry.coordinates;

            const description = hoveredFeature.properties.name || 'No data available';

            this.currentPopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup',
                anchor: 'left',
                offset: 10,
            })
                .setLngLat(coordinates)
                .setHTML(`<div class="popup-content">${description}</div>`)
                .addTo(this._map);
        } else if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
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
                const layerIds = this._current_objects[primaryKey];
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

        const layerIds = [];

        // Ajouter les couches selon les types de géométrie
        if (foundTypes.has("Point") || foundTypes.has("MultiPoint")) {
            layerIds.push(this._addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth));
        }

        if (foundTypes.has("LineString") || foundTypes.has("MultiLineString")) {
            layerIds.push(this._addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity));
        }

        if (foundTypes.has("Polygon") || foundTypes.has("MultiPolygon")) {
            layerIds.push(...this._addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity));
        }

        // Enregistrer les couches
        this._current_objects[primaryKey] = layerIds;

        // Enregistrer auprès du gestionnaire de couches (seulement si pas déjà lazy)
        if(this.isLoaded && !this.isLazy) {
            this.layerManager.registerOverlay(this.options.category, primaryKey, layerIds, this.options.nameHTML);
        }
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
    _addPointLayer(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeOpacity, strokeWidth) {
        const layerId = `${layerIdBase}-points`;
        this._map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            filter: ['any',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['geometry-type'], 'MultiPoint']
            ],
            paint: {
                'circle-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
                    rgbaStr
                ],
                'circle-opacity': fillOpacity,
                'circle-stroke-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
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
    _addLineLayer(layerIdBase, sourceId, strokeColor, strokeWidth, strokeOpacity) {
        const layerId = `${layerIdBase}-lines`;
        this._map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            filter: ['any',
                ['==', ['geometry-type'], 'LineString'],
                ['==', ['geometry-type'], 'MultiLineString']
            ],
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
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
    _addPolygonLayers(layerIdBase, sourceId, rgbaStr, strokeColor, fillOpacity, strokeWidth, strokeOpacity) {
        const fillLayerId = `${layerIdBase}-polygon-fill`;
        const strokeLayerId = `${layerIdBase}-polygon-stroke`;

        // Couche de remplissage
        this._map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            filter: ['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
            ],
            paint: {
                'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
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
            filter: ['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
            ],
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    '#FF0000',
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
        this.highlight(primaryKey, true);
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