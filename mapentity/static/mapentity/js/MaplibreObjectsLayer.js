class MaplibreObjectsLayer {
    /**
     * Classe MaplibreObjectsLayer pour gérer les couches d'objets sur une carte Maplibre.
     * @param geojson {Object} - Un objet GeoJSON ou un tableau de géométries à ajouter à la carte.
     * @param options {Object} - Un objet d'options pour configurer la couche, par exemple pour définir des styles ou des propriétés supplémentaires.
     */
    constructor(geojson, options) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.options = { ...options };
        this.boundsLayer = null;
        this.currentPopup = null;
        this.layers = {
            baseLayers: {},
            overlays: {}
        };
    }

    /**
     * Initialise la couche d'objets sur la carte Maplibre.
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre sur laquelle ajouter la couche.
     */
    initialize(map) {
        this._map = map;
        const onClick = (e) => this._onClick(e);
        const onMouseMove = (e) => this._onMouseMove(e);
        this._map.on('click', onClick);
        this._map.on('mousemove', onMouseMove);
    }

    /**
     * Gère l'événement de clic sur la carte.
     * @param e {Object} - L'événement de clic contenant les coordonnées du point cliqué.
     * @private
     */
    _onClick(e) {
        // Skip interactions in readonly mode
        if (this.options.readonly){
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point);

        if (features.length > 0) {
            const feature = features[0];
            if (this.options.objectUrl) {
                window.location = this.options.objectUrl(feature.properties, feature);
            }
        }
    }

    /**
     * Gère le mouvement de la souris sur la carte pour afficher des informations contextuelles.
     * @param e {Object} - L'événement de mouvement de la souris contenant les coordonnées.
     * @private
     */
    _onMouseMove(e) {
        if (this.options.readonly) return;

        const features = this._map.queryRenderedFeatures(e.point);
        const hoveredFeature = features[0];

        let hoveredFeatureId = null;

        if (hoveredFeature) {
            hoveredFeatureId = hoveredFeature.id || hoveredFeature.properties?.id;
            this._map.getCanvas().style.cursor = 'pointer';
        } else {
            this._map.getCanvas().style.cursor = '';
        }

        // RESET hover = false sur tous les features ≠ hoveredFeatureId
        const layers = Object.values(this._current_objects).flat();

        for (const layerId of layers) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) continue;

            for (const feature of source._data.features) {
                if (!feature.id) continue;
                const isHovered = feature.id === hoveredFeatureId;
                this._map.setFeatureState(
                    { source: sourceId, id: feature.id },
                    { hover: isHovered }
                );
            }
        }

        if (hoveredFeatureId) {
            if (this.currentPopup) {
                this.currentPopup.remove();
                this.currentPopup = null;
            }

            const coordinates =
                hoveredFeature.geometry.type === 'Point'
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
     * Charge des données GeoJSON à partir d'une URL.
     * @param url {string} - L'URL à partir de laquelle charger les données GeoJSON.
     * @returns {Promise<void>} - Une promesse qui se résout lorsque les données sont chargées et ajoutées à la carte.
     */
    async load(url) {
        console.log("Loading data from URL: " + url);
        this.loading = true;
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.addData(data);
            this._map.fire('layers:added', { layers: this.getLayers() });
        } catch (error) {
            console.error("Could not load url '" + url + "'", error);
        }
    }

    /**
     * Ajoute des données GeoJSON à la carte.
     * @param geojson {Object} - Un objet GeoJSON ou un tableau de géométries à ajouter à la carte.
     */
    addData(geojson) {

        const dataId = this._generateUniqueId();

        this._objects[dataId] = geojson;

        if(geojson.type === "Feature"){

            this.addLayer(geojson,dataId, true, true);

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
     * Met en surbrillance un objet sur la carte en fonction de sa clé primaire.
     * @param primaryKey {string|number} - La clé primaire de l'objet à mettre en surbrillance.
     * @param on {boolean} - Indique si la surbrillance doit être activée ou désactivée.
     */
    highlight(primaryKey, on = true) {
        if (this.options.readonly) {
            return;
        }

        const layersBySource = Object.values(this._current_objects).flat(); // récupère tous les layerIds

        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) {
                continue;
            }

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) {
                continue;
            }

            for (const feature of source._data.features) {
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
     * Sélectionne un objet sur la carte en fonction de sa clé primaire.
     * @param primaryKey {string|number} - La clé primaire de l'objet à sélectionner.
     * @param on {boolean} - Indique si la sélection doit être activée ou désactivée.
     */
    select(primaryKey, on = true) {
        this.highlight(primaryKey, true);
    }

    /**
     * Ajoute une couche à la carte en fonction des données GeoJSON fournies.
     * @param geojson {Object} - Un objet GeoJSON ou un tableau de géométries à ajouter à la carte.
     * @param pk {string|number} - La clé primaire de l'objet à ajouter, utilisée pour identifier la couche.
     * @param detailStatus {boolean} - Indique si le style détaillé doit être appliqué (par défaut: false).
     * @param readonly {boolean} - Indique si la couche doit être en mode lecture seule (par défaut: false).
     */
    addLayer(geojson, pk, detailStatus = false, readonly = false) {
        const primaryKey = pk;
        const foundTypes = new Set();

        if (geojson.type === "Feature") {
            if (!geojson.id && geojson.properties?.id) {
                geojson.id = geojson.properties.id;
            }
            const geomType = geojson.geometry?.type;
            if (geomType === "GeometryCollection" && geojson.geometry.geometries) {
                geojson.geometry.geometries.forEach(g => {
                    if (g.type) {
                        foundTypes.add(g.type);
                    }
                });
            } else if (geomType) {
                foundTypes.add(geomType);
            }
        } else if (geojson.type === "FeatureCollection") {
            geojson.features.forEach(feature => {
                if (!feature.id && feature.properties?.id) {
                    feature.id = feature.properties.id;
                }
                const geomType = feature.geometry?.type;
                if (geomType === "GeometryCollection" && feature.geometry.geometries) {
                    feature.geometry.geometries.forEach(g => {
                        if (g.type) {
                            foundTypes.add(g.type);
                        }
                    });
                } else if (geomType) {
                    foundTypes.add(geomType);
                }
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

        const style = detailStatus ? this.options.detailStyle : this.options.style;
        const rgba = parseColor(style.color); // [r, g, b, a]
        const rgbaStr = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        const fillOpacity = style.fillOpacity ?? 0.7; // default fill opacity
        const strokeOpacity = style.opacity ?? 1.0; // default opacity
        const strokeColor = style.color;
        const strokeWidth = style.weight ?? 5; // default width

        const layerIds = [];

        if (foundTypes.has("Point") || foundTypes.has("MultiPoint")) {
            this._map.addLayer({
                id: `${layerIdBase}-points`,
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
                        '#FF0000', // Change color on hover
                        rgbaStr
                    ],
                    'circle-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        fillOpacity, // Increase opacity on hover
                        fillOpacity
                    ],
                    'circle-stroke-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000', // Change color on hover
                        strokeColor
                    ],
                    'circle-stroke-opacity': strokeOpacity,
                    'circle-stroke-width': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        strokeWidth, // Increase width on hover
                        strokeWidth
                    ],
                    'circle-radius': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        10, // Increase radius on hover
                        8
                    ]
                }
            });
            layerIds.push(`${layerIdBase}-points`);
        }

        if (foundTypes.has("LineString") || foundTypes.has("MultiLineString")) {
            this._map.addLayer({
                id: `${layerIdBase}-lines`,
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
            layerIds.push(`${layerIdBase}-lines`);
        }

        if (foundTypes.has("Polygon") || foundTypes.has("MultiPolygon")) {
            // Add a fill layer for polygons
            this._map.addLayer({
                id: `${layerIdBase}-polygon-fill`,
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

            // Add a stroke layer for polygons
            this._map.addLayer({
                id: `${layerIdBase}-polygon-stroke`,
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
            layerIds.push(`${layerIdBase}-polygon-fill`, `${layerIdBase}-polygon-stroke`);
        }

        this._current_objects[primaryKey] = layerIds;

        const category = this.options.modelname;
        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }
        this.layers.overlays[category][primaryKey] = layerIds;
    }

    /**
     * Ajoute une couche de base à la carte.
     * @param name {string} - Le nom de la couche de base.
     * @param layerConfig {Object} - La configuration de la couche de base, contenant les propriétés suivantes :
     */
    addBaseLayer(name, layerConfig) {
        const { id, tiles, tileSize = 256, attribution = '' } = layerConfig;

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
    }

    /**
     * Bascule la visibilité d'une ou plusieurs couches.
     * @param layerIds {string|Array<string>} - L'ID ou les IDs des couches à basculer. Peut être une chaîne de caractères ou un tableau de chaînes.
     * @param visible {boolean} - Indique si les couches doivent être visibles ou non. Par défaut, c'est `true`.
     */
    toggleLayer(layerIds, visible = true) {
        // console.log(`Toggling layer(s): ${layerIds} to ${visible ? 'visible' : 'hidden'}`);
        // Force en tableau si ce n'est pas déjà un tableau
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
     * Récupère les couches actuellement gérées par cette instance.
     * @returns {*|{baseLayers: {}, overlays: {}}}
     */
    getLayers() {
        return this.layers;
    }

    /**
     * Récupère un objet de couche en fonction de sa clé primaire.
     * @param primaryKey {string|number} - La clé primaire de l'objet de couche à récupérer.
     * @returns {*} - L'objet de couche correspondant à la clé primaire, ou `undefined` si non trouvé.
     */
    getLayer(primaryKey) {
        return this._objects[primaryKey];
    }

    /**
     * Génère un identifiant unique pour une feature.
     * @param feature {Object} - La feature pour laquelle générer un identifiant.
     * @returns {string} - Un identifiant unique sous forme de chaîne de caractères.
     * @private
     */
    _generateUniqueId(feature) {
        return `${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Récupère les objets actuellement gérés par cette instance.
     * @returns {*|{}} - Un objet contenant les objets actuellement gérés, organisés par clé primaire.
     */
    getCurrentLayers() {
        return this._current_objects;
    }

    /**
     * Récupère la couche de limites (bounds) actuellement utilisée.
     * @returns {null} - La couche de limites, ou `null` si aucune couche de limites n'est définie.
     */
    getBoundsLayer() {
        return this.boundsLayer;
    }

    /**
     * Met à jour la couche d'objets en fonction des clés primaires fournies.
     * @param primaryKeys {Array<string|number>} - Un tableau de clés primaires pour lesquelles mettre à jour les objets.
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

        // Trouver le sourceId via les layerIds dans _current_objects
        for (let i = 0; i < layersBySource.length; i++) {
            const layerId = layersBySource[i];
            const layer = this._map.getLayer(layerId);

            if (!layer) {
                console.log("Aucun layer trouvé, continuer...");
                continue;
            }

            const currentSourceId = layer.source;
            const source = this._map.getSource(currentSourceId);

            if (source && source._data && source._data.features) {
                sourceId = currentSourceId;
                fullFeatureCollection = source._data;
                break;
            }
        }

        if (!sourceId || !fullFeatureCollection) {
            console.warn('Aucune source valide trouvée');
            return;
        }

        const source = this._map.getSource(sourceId);

        // Sauvegarder les features actuelles si non encore tracées
        fullFeatureCollection.features.forEach(feature => {
            const featureId = feature.properties?.id;
            if (featureId && !this._track_objects[featureId]) {
                this._track_objects[featureId] = { ...feature };
            }
        });

        // Reconstituer les features à afficher à partir de primaryKeys
        const featuresToShow = [];

        primaryKeys.forEach(primaryKey => {
            const feature = this._track_objects[primaryKey];
            if (feature) {
                featuresToShow.push(feature);
            }
        });

        // Mettre à jour la source avec les nouvelles features visibles
        source.setData({
            type: 'FeatureCollection',
            features: featuresToShow
        });

    }

    /**
     * Déplace la carte pour centrer sur une feature spécifique en fonction de sa clé primaire.
     * @param pk {string|number} - La clé primaire de la feature à centrer.
     */
    jumpTo(pk) {
        let feature = null;
        const layersBySource = Object.values(this._current_objects).flat();

        if (layersBySource.length === 0) {
            console.warn("Aucun layer trouvé dans _current_objects");
            return;
        }

        // Chercher la feature dans les sources actives
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const source = this._map.getSource(layer.source);
            if (source && source._data && source._data.features) {
                const foundFeature = source._data.features.find(f => f.properties?.id === pk);
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
        } else {
            console.warn(`Impossible de calculer les bounds pour la feature ${pk}`);
        }
    }

}