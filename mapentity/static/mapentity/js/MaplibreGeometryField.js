class MaplibreGeometryField {
    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {...options};

        // Détecter les types de géométrie
        const geomType = (this.options.geomType).toLowerCase();
        this.options.isGeneric = /geometry/.test(geomType);
        this.options.isCollection = /(^multi|collection$)/.test(geomType);
        this.options.isLineString = /linestring$/.test(geomType);
        this.options.isPolygon = /polygon$/.test(geomType);
        this.options.isPoint = /point$/.test(geomType);

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
        this.drawManager = new MaplibreDrawControlManager(map, this.options);

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
        // Mettre à jour l'historique des événements
        if (!this._updateEventsHistory(event)) {
            return;
        }

        const allFeatures = this._getFeatureCollection();

        let normalizedData;

        if (this.options.isCollection) {
            // Mode générique : créer une GeometryCollection avec toutes les géométries
            const geometries = allFeatures.features.map(feature => feature.geometry);
            normalizedData = this.dataManager.normalizeToGeometryCollection(geometries);
        } else {
            // Mode spécifique : normaliser selon le type
            if (this.options.isLineString || this.options.isPolygon || this.options.isPoint || this.options.isGeneric) {
                // Pour les événements de suppression, on prend toutes les features restantes
                // Pour les autres événements, on prend la dernière feature modifiée
                const targetFeature = event.type === 'gm:remove' ? allFeatures.features[0] : allFeatures.features.at(-1);

                if (targetFeature) {
                    normalizedData = this.dataManager.normalizeToFeatureCollection(targetFeature);
                } else {
                    // Si aucune feature n'est disponible (toutes supprimées), normaliser avec null
                    normalizedData = this.dataManager.normalizeToFeatureCollection(null);
                }
            }
        }

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
     * Configurer les événements Geoman pour la création, l'édition et le suivi en direct des géométries
     * @private
     */
    _setupGeomanEvents() {
        // Attendre que Geoman soit complètement chargé
        this.map.on("gm:loaded", () => {
            const geoman = this.drawManager.getGeoman();
            // Vérifier si Geoman est disponible
            if (!geoman) {
                console.error('Geoman instance is not available');
                return;
            }

            // Événement de début de dessin
            this.map.on('gm:globaldrawmodetoggled', (event) => {
                try {
                    if (event.enabled) {
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
                            const source = this.map.getSource('gm_main');
                            if (source) {
                              const data = source._data;

                              // Si on a déjà une feature existante, on la retire
                              if (this.gmEvents.length >= 1) {
                                const featureIdToDelete = this.gmEvents[0].id;
                                data.features = data.features.filter(f => f.id !== featureIdToDelete);

                                // Mettre à jour la liste locale : on retire l'ancien élément
                                this.gmEvents.shift();
                              }

                              // Puis remettre à jour la source
                              source.setData(data.geojson);
                            }
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
                try {
                    this._processAndSaveGeometry(event);

                    // Réinitialiser les coordonnées pour la prochaine forme si on est toujours en mode dessin
                    if ((event.shape === 'line' && this.isDrawingLine) ||
                        (event.shape === 'polygon' && this.isDrawingPolygon) ||
                        (event.shape === 'rectangle' && this.isDrawingRectangle)) {
                        this._resetDrawingCoords();
                    }

                    // Désactiver le mode de dessin après la création
                    if(this.options.isPoint || this.options.isPolygon || this.options.isLineString) {
                        this.map.gm.disableDraw();
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
        });
    }
}