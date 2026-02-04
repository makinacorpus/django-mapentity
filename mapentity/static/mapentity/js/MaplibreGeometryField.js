class MaplibreGeometryField {
    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {...options};

        // Les options peuvent être injectées par le template en tant que chaînes
        this.options.modifiable = this.options.modifiable === true || this.options.modifiable === 'true';

        // Détecter les types de géométrie
        const geomType = (this.options.geomType || '').toLowerCase();
        this.options.isGeneric = geomType === 'geometry';
        this.options.isGeometryCollection = /geometrycollection$/.test(geomType);
        this.options.isCollection = /(^multi|collection$)/.test(geomType);
        this.options.isLineString = /linestring$/.test(geomType);
        this.options.isPolygon = /polygon$/.test(geomType);
        this.options.isPoint = /point$/.test(geomType);

        // Distinction entre simple et multi pour les types de base
        this.options.isMultiPolygon = /^multipolygon$/.test(geomType);
        this.options.isMultiLineString = /^multilinestring$/.test(geomType);
        this.options.isMultiPoint = /^multipoint$/.test(geomType);

        // Initialiser les composants
        this.dataManager = new GeometryDataManager(this.options);
        this.fieldStore = new MaplibreFieldStore(this.fieldId, this.options);

        this.livePopup = null;
        this.isDrawingLine = false;
        this.isDrawingPolygon = false;
        this.isDrawingRectangle = false;
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;

        this.map = map;
        
        // Détecter si on est en mode édition (PK présente)
        this.options.isUpdate = !!document.body.dataset.pk;

        // Use shared draw manager if multi-field manager exists, otherwise create own
        const multiFieldManager = this.map._mapentityMultiFieldManager;
        if (multiFieldManager && multiFieldManager.drawManager) {
            this.drawManager = multiFieldManager.drawManager;
            console.log('MaplibreGeometryField: using shared draw manager from multi-field manager');
        } else {
            this.drawManager = new MaplibreDrawControlManager(map, this.options);
            console.log('MaplibreGeometryField: created own draw manager');
        }

        // stock les Features Geoman
        this.gmEvents = [];

        this._setupGeomanEvents();
    }

    /**
     * Fonction utilitaire pour obtenir le GeoJSON d'une feature
     * @param featureData {Object} - La feature Geoman contenant les données de la géométrie
     * @return {Object|null} - Retourne l'objet GeoJSON ou null en cas d'erreur
     * @private
     */
    _getGeoJson(featureData) {
        try {
            return featureData.getGeoJson();
        } catch (e) {
            console.warn('Cannot retrieve GeoJSON:', e);
            return null;
        }
    }

    /**
     * Obtenir la collection de features
     * @return {Object} - Un objet GeoJSON de type FeatureCollection contenant toutes les features
     * @private
     */
    _getFeatureCollection() {
        console.log('MaplibreGeometryField: gmEvents in _getFeatureCollection', this.gmEvents);
        return {
            type: 'FeatureCollection',
            features: this.gmEvents
                .map(e => e.geojson)
                .filter(f => !!f)
        };
    }

    /**
     * Mis à jour de gmEvents avec de nouvelles données ou suppression
     * @param event {Object} - L'événement Geoman contenant les données de la feature
     * @return {boolean} - Retourne true si l'événement a été traité avec succès, false sinon
     * @private
     */
    _updateEventsHistory(event) {
        console.log('MaplibreGeometryField: _updateEventsHistory', event.type, event.feature?.id);
        const eventId = event?.feature?.id;
        if (!eventId) {
            console.warn('Event without feature ID, skipping');
            return false;
        }

        if (event.type === 'gm:remove') {
            // Supprimer la feature du tableau
            const index = this.gmEvents.findIndex(e => e.id === eventId);
            if (index !== -1) {
                this.gmEvents.splice(index, 1);
            }
        } else {
            // Pour create, editend, dragend etc.
            const geoJson = event?.feature ? this._getGeoJson(event.feature) : null;
            if (!geoJson) {
                console.warn('Could not extract GeoJSON from feature');
                return false;
            }

            const eventData = {
                id: eventId,
                type: event?.type,
                shape: event?.shape ?? undefined,
                geojson: geoJson,
            };

            const index = this.gmEvents.findIndex(e => e.id === eventId);
            if (index !== -1) {
                // Remplacer la donnée existante
                this.gmEvents[index] = eventData;
            } else {
                // Ajouter nouvelle entrée
                this.gmEvents.push(eventData);
            }
        }

        return true;
    }

    /**
     * Traiter et sauvegarder la géométrie après un événement create, editend, dragend ou remove
     * @param event {Object} - L'événement Geoman contenant les données de la feature
     * @return {void}
     * @private
     */
    _processAndSaveGeometry(event) {
        console.log('MaplibreGeometryField: _processAndSaveGeometry', event.type, event);
        // Mettre à jour l'historique des événements
        if (!this._updateEventsHistory(event)) {
            console.warn('MaplibreGeometryField: update events history failed');
            return;
        }

        const allFeatures = this._getFeatureCollection();
        console.log('MaplibreGeometryField: allFeatures', allFeatures);
        let normalizedData;

        // Gestion des types 'Multi' et 'Collection'
        if (this.options.isCollection) {
            // Extraire les géométries des features
            // Note: feature peut être une Feature GeoJSON {type: "Feature", geometry: {...}}
            // ou directement une geometry {type: "Polygon", coordinates: [...]}
            const geometries = allFeatures.features.map(feature => {
                if (feature.type === 'Feature' && feature.geometry) {
                    return feature.geometry;
                }
                // Si c'est directement une geometry (a un type et des coordinates)
                if (feature.type && feature.coordinates) {
                    return feature;
                }
                // Fallback
                return feature.geometry || feature;
            });
            
            // On vérifie le type de champ spécifique pour savoir comment normaliser
            if (this.options.isMultiPolygon) {
                normalizedData = this.dataManager.normalizeToMultiPolygon(geometries);
            } else if (this.options.isMultiLineString) {
                normalizedData = this.dataManager.normalizeToMultiLineString(geometries);
            } else if (this.options.isMultiPoint) {
                normalizedData = this.dataManager.normalizeToMultiPoint(geometries);
            } else {
                // GeometryCollection générique ou cas non géré explicitement
                normalizedData = this.dataManager.normalizeToGeometryCollection(geometries);
            }
        } else {
            // Mode spécifique simple : normaliser selon le type
            if (this.options.isLineString || this.options.isPolygon || this.options.isPoint || this.options.isGeneric) {
                // Pour les événements de suppression, on prend toutes les features restantes (devrait être 0 ou 1)
                // Pour les autres événements, on prend la feature qui vient d'être modifiée/créée
                let targetFeature = null;
                
                if (event.type === 'gm:remove') {
                    targetFeature = allFeatures.features[0];
                } else if (event.feature) {
                    // Si l'événement fournit la feature, on utilise son GeoJSON
                    targetFeature = this._getGeoJson(event.feature);
                    
                    // Fallback si _getGeoJson échoue
                    if (!targetFeature && allFeatures.features.length > 0) {
                        targetFeature = allFeatures.features.find(f => f.id === event.feature.id) || allFeatures.features.at(-1);
                    }
                } else {
                    targetFeature = allFeatures.features.at(-1);
                }

                console.log('MaplibreGeometryField: targetFeature for save', targetFeature);

                if (targetFeature) {
                    // Pour un champ simple, on envoie directement la géométrie (pas une FeatureCollection)
                    // Si c'est déjà une feature, on extrait la géométrie
                    normalizedData = targetFeature.geometry || targetFeature;
                    
                    // Si c'est un point simple, Geoman peut parfois renvoyer des coordonnées sous forme d'objet {lng, lat}
                    // On s'assure d'avoir un tableau pour GeoJSON
                    if (normalizedData.type === 'Point' && !Array.isArray(normalizedData.coordinates)) {
                        const coords = normalizedData.coordinates;
                        if (coords.lng !== undefined && coords.lat !== undefined) {
                            normalizedData.coordinates = [coords.lng, coords.lat];
                        }
                    }
                } else {
                    // Si aucune feature n'est disponible (toutes supprimées), normaliser avec null
                    normalizedData = null;
                }
            }
        }

        console.log('MaplibreGeometryField: normalizedData for fieldStore', normalizedData);

        // Sauvegarder si des données ont été normalisées
        if (normalizedData !== undefined) {
            this.fieldStore.save(normalizedData);
        }
    }

    /**
     * Gestion des événements de clic pendant le dessin
     * @param event {Object} - L'événement de clic contenant les coordonnées du clic
     * @return {void}
     * @private
     */
    _handleDrawingClick(event) {
        if (!this.isDrawingLine && !this.isDrawingPolygon && !this.isDrawingRectangle) {
            return;
        }

        const coords = [event.lngLat.lng, event.lngLat.lat];

        if (this.isDrawingLine) {
            // Ajouter le point cliqué aux coordonnées de dessin
            this.currentDrawingCoords.push(coords);
            this._updateDrawingPopup(coords, false);
        } else if (this.isDrawingRectangle) {
            // Pour le rectangle, on ne stocke que le premier point
            if (this.currentDrawingCoords.length === 0) {
                this.rectangleStartCoord = coords;
                this.currentDrawingCoords.push(coords);
                this._updateDrawingPopup(coords, false);
            }
        } else if (this.isDrawingPolygon) {
            // Ajouter le point cliqué aux coordonnées de dessin du polygone
            this.currentDrawingCoords.push(coords);
            this._updateDrawingPopup(coords, false);
        }
    }

    /**
     * Gestion des mouvements de la souris pendant le dessin en direct
     * @param event {Object} - L'événement de mouvement de la souris contenant les données du marqueur
     * @return {void}
     * @private
     */
    _handleLiveDrawing(event) {
        if ((!this.isDrawingLine && !this.isDrawingPolygon && !this.isDrawingRectangle) ||
            !event.markerData?.position?.coordinate) {
            return;
        }

        const mouseCoords = event.markerData.position.coordinate;

        // Mettre à jour la popup avec la position de la souris
        this._updateDrawingPopup(mouseCoords, true);
    }

    /**
     * Met à jour la popup de dessin en direct avec les distances ou surfaces
     * @param currentCoords {Array} - Les coordonnées actuelles du marqueur
     * @param isLive {boolean} - Indique si c'est un suivi en direct ou non
     * @return {void}
     * @private
     */
    _updateDrawingPopup(currentCoords, isLive = false) {
        if (!this.livePopup) {
            return;
        }

        let formattedMessage = '';

        if (this.isDrawingLine) {
            formattedMessage = this._getLineDrawingMessage(currentCoords, isLive);
        } else if (this.isDrawingRectangle) {
            formattedMessage = this._getRectangleDrawingMessage(currentCoords, isLive);
        } else if (this.isDrawingPolygon) {
            formattedMessage = this._getPolygonDrawingMessage(currentCoords, isLive);
        }

        // Afficher la popup à la position actuelle
        this.livePopup.setLngLat(currentCoords).setHTML(formattedMessage);
    }

    /**
     * Obtient le message de dessin pour la ligne
     * @param currentCoords {Array} - Les coordonnées actuelles du marqueur
     * @param isLive {boolean} - Indique si c'est un suivi en direct ou non
     * @return {string} - Le message de dessin formaté
     * @private
     */
    _getLineDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return 'Cliquer pour commencer le dessin de la ligne';
        } else if (this.currentDrawingCoords.length >= 1) {
            const tempCoords = [...this.currentDrawingCoords];

            if (isLive) {
                tempCoords.push(currentCoords);
            }

            if (tempCoords.length >= 2) {
                const tempLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: tempCoords
                    }
                };

                const distance = turf.length(tempLine, { units: 'kilometers' });
                const formattedDistance = `${distance.toFixed(2)} km`;

                if (this.currentDrawingCoords.length === 1) {
                    return formattedDistance + '<br>Cliquer pour continuer le dessin de la ligne';
                } else {
                    return formattedDistance + '<br>Cliquer sur le dernier point pour terminer la ligne';
                }
            } else {
                return 'Cliquer pour continuer le dessin de la ligne';
            }
        }
        return '';
    }

    /**
     * Obtient le message de dessin pour le rectangle
     * @param currentCoords {Array} - Les coordonnées actuelles du marqueur
     * @param isLive {boolean} - Indique si c'est un suivi en direct ou non
     * @return {string} - Le message de dessin formaté
     * @private
     */
    _getRectangleDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return 'Cliquer et glisser pour dessiner le rectangle';
        } else if (this.currentDrawingCoords.length === 1) {
            if (isLive && this.rectangleStartCoord) {
                // Créer un rectangle temporaire avec les coordonnées de début et la position actuelle
                const tempRectangle = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            this.rectangleStartCoord,
                            [currentCoords[0], this.rectangleStartCoord[1]],
                            currentCoords,
                            [this.rectangleStartCoord[0], currentCoords[1]],
                            this.rectangleStartCoord
                        ]]
                    }
                };

                const area = turf.area(tempRectangle) / 1000000; // Convertir en km²
                const formattedArea = `${area.toFixed(2)} km²`;
                return formattedArea + '<br>Cliquer pour terminer le rectangle';
            } else {
                return 'Cliquer pour terminer le rectangle';
            }
        }
        return '';
    }

    /**
     * Obtient le message de dessin pour le polygone
     * @param currentCoords {Array} - Les coordonnées actuelles du marqueur
     * @param isLive {boolean} - Indique si c'est un suivi en direct ou non
     * @return {string} - Le message de dessin formaté
     * @private
     */
    _getPolygonDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return 'Cliquer pour commencer le dessin de la forme';
        } else if (this.currentDrawingCoords.length === 1 || this.currentDrawingCoords.length === 2) {
            return 'Cliquer pour continuer le dessin de la forme';
        }else if (this.currentDrawingCoords.length >= 3) {
            return 'Cliquer sur le premier point pour fermer la forme';
        }
        return '';
    }

    /**
     * Rénitialiser les coordonnées de dessin
     * @return {void}
     * @private
     */
    _resetDrawingCoords() {
        // Réinitialiser les coordonnées pour recommencer une nouvelle forme
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;

        // S'assurer que les couches Geoman restent au-dessus après une création
        if (this.map.getStyle()) {
            const layers = this.map.getStyle().layers || [];
            layers.forEach(layer => {
                if (layer.id.startsWith('gm-') || layer.id.startsWith('geoman-')) {
                    try {
                        this.map.moveLayer(layer.id);
                    } catch (e) {
                        // Ignorer si la couche n'est plus là
                    }
                }
            });
        }
    }

    /**
     * Arrêter le suivi du dessin en direct
     * @return {void}
     * @private
     */
    _stopLiveDrawingTracking() {
        if (this.livePopup) {
            this.livePopup.remove();
            this.livePopup = null;
        }

        // Réinitialiser toutes les variables de dessin
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;
        this.isDrawingLine = false;
        this.isDrawingPolygon = false;
        this.isDrawingRectangle = false;
    }

    /**
     * Charge la géométrie initiale à partir du champ de formulaire
     * @private
     */
    _loadInitialGeometry() {
        const value = this.fieldStore.formField?.value;
        if (!value) return;

        let initialFeatures = [];
        try {
            const geojson = JSON.parse(value);
            const normalized = this.dataManager.normalizeToFeatureCollection(geojson);
            initialFeatures = normalized.features;
        } catch (e) {
            console.warn('MaplibreGeometryField: could not parse initial geometry', e);
            return;
        }

        // Assurer que chaque feature a un id stable
        initialFeatures.forEach(f => {
            if (!f.id) {
                f.id = f.properties?.id || generateUniqueId();
            }
        });

        if (initialFeatures.length > 0) {
            // Identifier et exclure les features en cours d'édition de la couche d'objets globale
            const idsToExclude = initialFeatures
                .map(f => f.id)
                .filter(id => id !== undefined && id !== null);

            // Ajouter l'ID de l'objet courant s'il est disponible dans le DOM (cas de l'édition)
            // Cela permet de masquer l'objet original même si les features Geoman ont des UUIDs temporaires
            if (document.body.dataset.pk) {
                const pk = document.body.dataset.pk;
                if (!idsToExclude.includes(pk)) idsToExclude.push(pk);

                const pkInt = parseInt(pk, 10);
                if (!isNaN(pkInt) && !idsToExclude.includes(pkInt)) {
                    idsToExclude.push(pkInt);
                }
            }

            if (idsToExclude.length > 0) {
                console.log('MaplibreGeometryField: Emitting mapentity:exclude-features', idsToExclude);
                this.map.fire('mapentity:exclude-features', { ids: idsToExclude });

                // Répéter au chargement complet pour s'assurer que les couches sont prêtes
                if (!this.map.loaded()) {
                    this.map.once('load', () => {
                         this.map.fire('mapentity:exclude-features', { ids: idsToExclude });
                    });
                }
            }

            const fitInitialBounds = () => {
                try {
                    const collection = { type: 'FeatureCollection', features: initialFeatures };
                    const bounds = calculateBounds(collection);
                    console.log('MaplibreGeometryField: immediate fitBounds with', bounds);
                    if (bounds) {
                        console.log('MaplibreGeometryField: applying fitBounds', bounds);
                        this.map.fitBounds(bounds, { padding: 50, maxZoom: 18, animate: false });
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: initial fitBounds failed', e);
                }
            };

            if (this.map.loaded()) {
                setTimeout(fitInitialBounds, 300);
            } else {
                this.map.once('load', () => setTimeout(fitInitialBounds, 300));
            }
        }

        // Attendre que Geoman soit chargé pour ajouter les features
        const addFeaturesToGeoman = () => {
            const geoman = this.drawManager.getGeoman();
            if (!geoman || !geoman.loaded) {
                console.log(`MaplibreGeometryField: waiting for geoman.loaded`);
                setTimeout(addFeaturesToGeoman, 100);
                return;
            }

            // Selon la version/intégration, l’API peut être exposée via `map.gm` ou via l’instance créée.
            const gmApi = this.map.gm || geoman;
            if (!gmApi?.features) {
                console.warn('MaplibreGeometryField: Geoman API not available (no features), cannot add initial geometry');
                return;
            }

            console.log('MaplibreGeometryField: geoman is loaded, adding features via addGeoJsonFeature', initialFeatures);
            
            // Forcer un rafraîchissement initial au cas où
            this.map.triggerRepaint();

            initialFeatures.forEach(feature => {
                try {
                    // S'assurer que la feature a un ID pour Geoman
                    if (!feature.id) {
                        feature.id = generateUniqueId();
                    }

                    // Injecter des styles par défaut pour assurer la visibilité (simplestyle spec)
                    feature.properties = feature.properties || {};
                    const defaultStyles = {
                        'stroke': '#3388ff',
                        'stroke-width': 3,
                        'stroke-opacity': 1,
                        'fill': '#3388ff',
                        'fill-opacity': 0.2
                    };
                    Object.entries(defaultStyles).forEach(([k, v]) => {
                         if (feature.properties[k] === undefined) feature.properties[k] = v;
                    });

                    const resolveGeomanSourceName = () => this._resolveGeomanSourceName();

                    // Utilisation de la méthode recommandée par la doc
                    console.log('MaplibreGeometryField: calling addGeoJsonFeature for', feature);

                    let result;
                    // Selon la version Geoman :
                    // - 0.6.x : `importGeoJsonFeature(geojsonFeature)`
                    // - certaines docs : `addGeoJsonFeature({ shapeGeoJson, sourceName })`
                    // - d'autres : `addGeoJsonFeature(geojsonFeature)`
                    if (typeof gmApi.features.importGeoJsonFeature === 'function') {
                        result = gmApi.features.importGeoJsonFeature(feature);
                    } else if (typeof gmApi.features.addGeoJsonFeature === 'function') {
                        try {
                            // Tentative 1 : signature la plus courante (GeoJSON direct)
                            result = gmApi.features.addGeoJsonFeature(feature);
                        } catch (e) {
                            // Tentative 2 : signature objet + sourceName
                            const sourceName = resolveGeomanSourceName();
                            result = gmApi.features.addGeoJsonFeature({ shapeGeoJson: feature, sourceName });
                        }
                    } else if (typeof gmApi.features.addGeoJson === 'function') {
                        // Certaines versions exposent une API plus simple
                        result = gmApi.features.addGeoJson(feature);
                    } else if (typeof gmApi.features.addFeature === 'function') {
                        result = gmApi.features.addFeature(feature);
                    } else if (typeof gmApi.features.add === 'function') {
                        result = gmApi.features.add(feature);
                    } else {
                        console.warn('MaplibreGeometryField: no compatible method found to add GeoJSON feature to Geoman');
                        return;
                    }
                    console.log('MaplibreGeometryField: addGeoJsonFeature result', result);
                    
                    // Si result contient l'ID directement
                    let addedId = typeof result === 'string' || typeof result === 'number' ? result : result?.id;
                    console.log('MaplibreGeometryField: identified addedId', addedId);

                    // On force l'affichage immédiat en passant par Geoman si possible
                    if (gmApi.features.getFeatureById) {
                         const f = gmApi.features.getFeatureById(addedId || feature.id);
                         console.log('MaplibreGeometryField: getFeatureById found', f);
                         if (f && f.show) {
                             console.log('MaplibreGeometryField: calling f.show()');
                             f.show();
                         }
                    }

                    // On met à jour l'historique local gmEvents directement avec la feature qu'on vient d'ajouter
                    // On n'attend pas la source car le nom peut varier et l'update peut être asynchrone
                    console.log('MaplibreGeometryField: updating events history with initial feature', addedId || feature.id);
                    this._updateEventsHistory({
                        type: 'gm:create',
                        feature: {
                            id: addedId || feature.id,
                            getGeoJson: () => feature
                        }
                    });
                } catch (e) {
                    console.warn('MaplibreGeometryField: error adding feature to Geoman', e);
                }
            });

            // Forcer un rafraîchissement
            this.map.triggerRepaint();

            // Centrer à nouveau après l'ajout à Geoman pour être sûr
            setTimeout(() => {
                try {
                    const collection = { type: 'FeatureCollection', features: initialFeatures };
                    const bounds = calculateBounds(collection);
                    if (bounds) {
                        console.log('MaplibreGeometryField: post-geoman fitBounds', bounds);
                        this.map.fitBounds(bounds, { padding: 50, maxZoom: 18, animate: false });
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: post-geoman fitBounds failed', e);
                }

                // Forcer le style des layers Geoman pour s'assurer qu'ils sont visibles (fallback)
                try {
                    const style = this.map.getStyle();
                    if (style && style.layers) {
                        let updated = false;
                        console.log('MaplibreGeometryField: checking layers for fallback styles');
                        style.layers.forEach(layer => {
                            // On cible les layers Geoman qui pourraient ne pas avoir de style défini
                            const isGeoman = layer.id.indexOf('gm_') !== -1 || layer.id.indexOf('geoman') !== -1;

                            if (isGeoman && layer.type !== 'symbol') {
                                console.log(`MaplibreGeometryField: found Geoman layer ${layer.id} (${layer.type})`);
                                if (layer.type === 'line') {
                                    this.map.setPaintProperty(layer.id, 'line-color', '#3388ff');
                                    this.map.setPaintProperty(layer.id, 'line-width', 3);
                                    this.map.setPaintProperty(layer.id, 'line-opacity', 1);
                                    updated = true;
                                } else if (layer.type === 'fill') {
                                    this.map.setPaintProperty(layer.id, 'fill-color', '#3388ff');
                                    this.map.setPaintProperty(layer.id, 'fill-opacity', 0.2);
                                    // Ajouter une couleur de contour pour le remplissage si supporté (fill-outline-color)
                                    // Cela aide si la couche de ligne est manquante ou invisible
                                    this.map.setPaintProperty(layer.id, 'fill-outline-color', '#3388ff');
                                    updated = true;
                                }
                            }
                        });
                        if (updated) {
                            console.log('MaplibreGeometryField: applied fallback styles to Geoman layers');
                            this.map.triggerRepaint();
                        } else {
                            console.log('MaplibreGeometryField: no Geoman layers found for styling fallback');
                        }
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: error applying fallback styles', e);
                }
            }, 800);
            
            // S'assurer que les couches sont au-dessus
            this._resetDrawingCoords();
            
            // Forcer Geoman à recalculer ses limites internes si besoin
            if (gmApi.update) {
                console.log('MaplibreGeometryField: calling gmApi.update()');
                gmApi.update();
            }
        };

        if (this.map.gm) {
            addFeaturesToGeoman();
        } else {
            this.map.once('gm:loaded', addFeaturesToGeoman);
        }
    }

    /**
     * Tente de résoudre le nom de la source de données Geoman
     * @return {string|null} - Le nom de la source ou null
     * @private
     */
    _resolveGeomanSourceName() {
        const gmApi = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
        
        // Geoman 0.6.x expose souvent un `defaultSourceName` côté `features`.
        const fromApi = gmApi?.features?.defaultSourceName;
        if (typeof fromApi === 'string' && fromApi.length > 0) {
            return fromApi;
        }

        // Fallback : essayer les sources connues côté MapLibre.
        if (this.map.getSource('gm_main')) return 'gm_main';
        if (this.map.getSource('geoman_main')) return 'geoman_main';

        // Dernier recours : chercher une source dont l'id ressemble à Geoman.
        const sources = this.map.getStyle?.()?.sources || {};
        const candidate = Object.keys(sources).find(k => k.startsWith('gm_') || k.startsWith('gm-') || k.includes('geoman'));
        return candidate || null;
    }

    /**
     * Récupère la source de données Geoman
     * @private
     */
    _getGeomanLayersSource() {
        const sourceName = this._resolveGeomanSourceName();
        return sourceName ? this.map.getSource(sourceName) : null;
    }

    /**
     * Supprime toutes les features Geoman sauf une optionnelle
     * @param exceptFeature {Object|null} - La feature (GeoJSON) à conserver
     * @private
     */
    _removeAllGeomanFeatures(exceptFeature = null) {
        const gmApi = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
        const exceptId = exceptFeature ? exceptFeature.id : null;
        
        // 1. Try to find a removal function via API
        let removeFunc = null;
        if (gmApi) {
            // Check in features namespace (standard)
            if (gmApi.features) {
                if (typeof gmApi.features.remove === 'function') {
                    removeFunc = gmApi.features.remove.bind(gmApi.features);
                } else if (typeof gmApi.features.removeFeature === 'function') {
                    removeFunc = gmApi.features.removeFeature.bind(gmApi.features);
                } else {
                    // Dynamic search in features
                    const candidate = Object.keys(gmApi.features).find(k => 
                        (k.toLowerCase().includes('remove') || k.toLowerCase().includes('delete')) && 
                        typeof gmApi.features[k] === 'function'
                    );
                    if (candidate) {
                        removeFunc = gmApi.features[candidate].bind(gmApi.features);
                    }
                }
            }

            // Check on gmApi directly (fallback for some versions/wrappers)
            if (!removeFunc) {
                 if (typeof gmApi.remove === 'function') removeFunc = gmApi.remove.bind(gmApi);
                 else if (typeof gmApi.removeFeature === 'function') removeFunc = gmApi.removeFeature.bind(gmApi);
                 else if (typeof gmApi.delete === 'function') removeFunc = gmApi.delete.bind(gmApi);
                 else if (typeof gmApi.deleteFeature === 'function') removeFunc = gmApi.deleteFeature.bind(gmApi);
            }
        }

        if (removeFunc) {
            // Using API to remove
            const sources = this._findAllGeomanSources();
            let allFeatures = [];
            sources.forEach(source => {
                 const data = source._data;
                 const features = (data?.geojson?.features) || (data?.features) || [];
                 allFeatures = allFeatures.concat(features);
            });
            
            if (allFeatures.length > 0) {
                // console.log(`MaplibreGeometryField: removing features via API (${allFeatures.length} candidates)`);
                allFeatures.forEach(f => {
                    // Use loose equality to match string/number IDs
                    if (f.id && f.id != exceptId) {
                        try {
                            removeFunc(f.id);
                        } catch (e) {
                            console.warn('MaplibreGeometryField: Failed to remove feature via API', f.id, e);
                        }
                    }
                });
            }
            return;
        }

        // 2. Fallback: Remove from ALL detected Geoman sources
        // We assume fallback is robust enough, so we log as info instead of warn to reduce noise
        console.log('MaplibreGeometryField: enforcing single geometry via source update (API fallback)');
        
        const sources = this._findAllGeomanSources();
        if (sources.length === 0) {
             console.warn('MaplibreGeometryField: No Geoman sources found for fallback');
             return;
        }

        sources.forEach(source => {
            if (source && source.setData) {
                const data = source._data;
                const features = (data?.geojson?.features) || (data?.features) || [];
                
                // On garde seulement la feature exceptée
                const keptFromSource = features.filter(f => exceptId != null && f.id == exceptId);
                let finalFeatures = [...keptFromSource];

                // Si la feature à garder n'est pas encore dans la source (ex: création asynchrone), on l'ajoute
                if (exceptFeature && keptFromSource.length === 0 && exceptId != null) {
                    console.log('MaplibreGeometryField: preserving new feature not yet in source', exceptId);
                    finalFeatures.push(exceptFeature);
                }
                
                // Vérifier si une mise à jour est nécessaire
                const currentIds = features.map(f => f.id).sort().join(',');
                const newIds = finalFeatures.map(f => f.id).sort().join(',');

                if (currentIds !== newIds) {
                    console.log(`MaplibreGeometryField: source fallback updating source (features: ${features.length} -> ${finalFeatures.length})`, source);
                    try {
                        source.setData({
                            type: 'FeatureCollection',
                            features: finalFeatures
                        });
                    } catch (e) {
                        console.error('MaplibreGeometryField: source fallback failed for source', source, e);
                    }
                }
            }
        });
    }

    /**
     * Trouve toutes les sources potentielles de Geoman
     * @return {Array} - Liste des objets Source
     * @private
     */
    _findAllGeomanSources() {
        if (!this.map || !this.map.getStyle) return [];
        const style = this.map.getStyle();
        if (!style || !style.sources) return [];
        
        return Object.keys(style.sources)
            .filter(k => k.startsWith('gm_') || k.startsWith('gm-') || k.includes('geoman'))
            .map(k => this.map.getSource(k))
            .filter(s => !!s);
    }

    /**
     * Configurer les événements Geoman pour la création, l'édition et le suivi en direct des géométries
     * @private
     */
    _setupGeomanEvents() {
        // Charger la géométrie initiale
        this._loadInitialGeometry();

        const registerGeomanHandlers = () => {
            if (this._geomanHandlersRegistered) return;
            this._geomanHandlersRegistered = true;
            const geoman = this.drawManager.getGeoman();
            // Vérifier si Geoman est disponible
            if (!geoman) {
                console.error('Geoman instance is not available');
                return;
            }

            // Événement de début de dessin
            this.map.on('gm:globaldrawmodetoggled', (event) => {
                console.log('MaplibreGeometryField: gm:globaldrawmodetoggled', event);
                try {
                    if (event.enabled) {
                        const geoman = this.drawManager.getGeoman();
                        const gmApi = this.map.gm || geoman;

                        // Si on est en mode géométrie unique, on supprime l'ancienne géométrie dès qu'on commence à en dessiner une nouvelle
                        // Cela permet de remplacer la feature existante par une nouvelle
                        if (!this.options.isCollection) {
                            console.log('MaplibreGeometryField: removing all existing features before drawing new one');
                            this._removeAllGeomanFeatures();

                            // On vide gmEvents immédiatement car on veut forcer le remplacement
                            this.gmEvents = [];
                            // On déclenche une sauvegarde (vide)
                            if (this.fieldStore) {
                                this.fieldStore.save(null);
                            }
                        } else {
                            // En mode collection, on peut vouloir restreindre certains boutons si besoin,
                            // mais ici on laisse Geoman gérer l'ajout de nouvelles features.
                        }

                        // Activer le mode de dessin approprié
                        if (event.shape === 'line') {
                            this.isDrawingLine = true;
                            this.isDrawingPolygon = false;
                            this.isDrawingRectangle = false;
                        } else if (event.shape === 'polygon') {
                            this.isDrawingLine = false;
                            this.isDrawingPolygon = true;
                            this.isDrawingRectangle = false;
                        } else if (event.shape === 'rectangle') {
                            this.isDrawingLine = false;
                            this.isDrawingPolygon = false;
                            this.isDrawingRectangle = true;
                        }

                        // Réinitialiser les coordonnées et créer la popup
                        this.currentDrawingCoords = [];
                        this.rectangleStartCoord = null;

                        // Créer la popup pour les mesures
                        if (!this.livePopup) {
                            this.livePopup = new maplibregl.Popup({
                                closeButton: false,
                                closeOnClick: false,
                                className: 'custom-popup',
                                anchor: 'left',
                                offset: 10
                            }).addTo(this.map);
                        }

                        // Désactiver le mode de dessin après la création
                        if(this.options.isPoint || this.options.isPolygon || this.options.isLineString) {
                            // On ne fait rien ici pour le moment car on veut que Geoman finisse sa création
                            // On a déjà géré la suppression des anciennes features au début (gm:globaldrawmodetoggled)
                            // et on la gère aussi à la fin (gm:create)
                        }
                    } else {
                        // Arrêter le tracking quand le mode dessin est désactivé
                        if (event.shape === 'line' || event.shape === 'polygon' || event.shape === 'rectangle') {
                            this._stopLiveDrawingTracking();
                        }
                    }

                } catch(error) {
                    console.error('Error during global draw mode toggle:', error);
                }
            });

            // Événement pour le suivi en temps réel pendant le dessin
            this.map.on('_gm:draw', (event) => {
                try {
                    if (event.mode === 'line' || event.mode === 'polygon' || event.mode === 'rectangle') {
                        this._handleLiveDrawing(event);
                    }
                } catch (error) {
                    console.error('Error during live drawing event:', error);
                }
            });

            // Événement pour la création de la géométrie
            this.map.on('gm:create', (event) => {
                console.log('MaplibreGeometryField: gm:create', event);
                try {
                    // S'assurer que la feature a un ID avant de traiter
                    if (event.feature && !event.feature.id) {
                        const newId = generateUniqueId();
                        console.log('MaplibreGeometryField: assigning new ID to feature', newId);
                        event.feature.id = newId;
                    }

                    // Si mode unique (pas collection/générique), supprimer les anciennes features AVANT de traiter la nouvelle
                    // Cela garantit qu'on ne garde qu'une seule feature à la fois
                    if (!this.options.isCollection && event.feature) {
                        const newFeatureId = event.feature.id;
                        console.log('MaplibreGeometryField: enforcing single geometry, removing others except', newFeatureId);

                        // On récupère le GeoJSON complet pour le passer au fallback si besoin
                        let featureGeoJson = this._getGeoJson(event.feature);
                        if (!featureGeoJson && event.feature && event.feature.type === 'Feature') {
                             featureGeoJson = event.feature;
                        }
                        // S'assurer que l'ID est présent
                        if (featureGeoJson && !featureGeoJson.id) featureGeoJson.id = newFeatureId;

                        this._removeAllGeomanFeatures(featureGeoJson);

                        // Nettoyer gmEvents pour ne garder que la nouvelle feature
                        this.gmEvents = this.gmEvents.filter(evt => evt.id === newFeatureId);
                    }

                    // Maintenant on traite et sauvegarde la géométrie (avec seulement la nouvelle feature pour les types simples)
                    this._processAndSaveGeometry(event);

                    // Réinitialiser les coordonnées pour la prochaine forme si on est toujours en mode dessin
                    if ((event.shape === 'line' && this.isDrawingLine) ||
                        (event.shape === 'polygon' && this.isDrawingPolygon) ||
                        (event.shape === 'rectangle' && this.isDrawingRectangle)) {
                        this._resetDrawingCoords();
                    }

                    // Désactiver le mode de dessin après la création
                    if(!this.options.isCollection) {
                        const gm = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
                        if (gm && gm.disableDraw) {
                            console.log('MaplibreGeometryField: disabling draw mode after creation');
                            gm.disableDraw();
                            // Force une deuxième fois pour être sûr que l'UI suit
                            setTimeout(() => gm.disableDraw(), 50);
                        }
                        this._stopLiveDrawingTracking();
                    }

                } catch (error) {
                    console.error('Error during feature creation:', error);
                }
            });

            // Événement pour la fin de l'édition
            this.map.on('gm:editend', (event) => {
                try {
                    this._processAndSaveGeometry(event);
                } catch (error) {
                    console.error('Error during feature edit:', error);
                }
            });

            // Événement de fin de déplacement
            this.map.on('gm:dragend', (event) => {
                try {
                    this._processAndSaveGeometry(event);
                } catch (error) {
                    console.error('Error during feature drag:', error);
                }
            });

            // Événement de suppression de la géométrie
            this.map.on('gm:remove', (event) => {
                try {
                    this._processAndSaveGeometry(event);
                } catch (error) {
                    console.error('Error during feature removal:', error);
                }
            });

            // Gérer les clics uniquement pendant le dessin
            this.map.on('click', (event) => {
                try {
                    this._handleDrawingClick(event);
                } catch(error) {
                    console.error('Error during click event:', error);
                }
            });
        };

        if (this.map.gm) {
            registerGeomanHandlers();
        }
        this.map.on("gm:loaded", registerGeomanHandlers);
    }

    /**
     * Called when this field is activated in multi-field mode
     */
    onActivated() {
        console.log('MaplibreGeometryField: field activated', this.fieldId);
        // Show this field's features
        // In a full implementation, we'd show/hide features based on field
    }

    /**
     * Called when this field is deactivated in multi-field mode
     */
    onDeactivated() {
        console.log('MaplibreGeometryField: field deactivated', this.fieldId);
        // Hide this field's features or make them read-only
        // In a full implementation, we'd show/hide features based on field
    }

    /**
     * Handle a Geoman event routed from the multi-field manager
     * @param {string} eventType - The event type
     * @param {Object} event - The event data
     */
    handleGeomanEvent(eventType, event) {
        console.log('MaplibreGeometryField: handling routed event', eventType, this.fieldId);
        // Route to appropriate handler based on event type
        // For now, the existing event handlers on the map will still work
    }
}