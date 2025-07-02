class MaplibreGeometryField {
    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {...options};

        // Détecter les types de géométrie
        const geomType = (this.options.geomType).toLowerCase();
        this.options.isGeneric = /geometrycollection$/.test(geomType);
        this.options.isLineString = /linestring$/.test(geomType);
        this.options.isPolygon = /polygon$/.test(geomType);
        this.options.isPoint = /point$/.test(geomType);

        // Initialiser les composants
        this.dataManager = new GeometryDataManager(this.options);
        this.fieldStore = new MaplibreFieldStore(this.fieldId, this.options);

        this.livePopup = null;
        this.isDrawingLine = false;
        this.isDrawingPolygon = false;

        this.map = map;
        this.drawManager = new MaplibreDrawControlManager(map, this.options);

        // Store unique events history (always up to date)
        this.gmEvents = [];

        this._setupGeomanEvents();
    }

    /**
     * Helper function to safely extract GeoJSON from feature
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
     * Get current FeatureCollection from stored events
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
     * Update gmEvents array with new event data
     */
    _updateEventsHistory(event) {
        console.log('Processing event:', event);

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
                console.log(`Feature with ID ${eventId} deleted from gmEvents`);
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

        console.log('Events history updated:', this.gmEvents);
        return true;
    }

    /**
     * Process and save geometry data after an event
     */
    _processAndSaveGeometry(event) {
        // Mettre à jour l'historique des événements
        if (!this._updateEventsHistory(event)) {
            return;
        }

        const allFeatures = this._getFeatureCollection();
        console.log('Current features:', allFeatures);

        // Construire la structure appropriée selon les options
        let normalizedData;

        if (this.options.isGeneric) {
            // Mode générique : créer une GeometryCollection avec toutes les géométries
            const geometries = allFeatures.features.map(feature => feature.geometry);
            console.log('Geometries to normalize:', geometries);
            normalizedData = this.dataManager.normalizeToGeometryCollection(geometries);
        } else {
            // Mode spécifique : normaliser selon le type
            if (this.options.isLineString || this.options.isPolygon || this.options.isPoint) {
                // Pour les événements de suppression, on prend toutes les features restantes
                // Pour les autres événements, on prend la dernière feature modifiée
                const targetFeature = event.type === 'gm:remove'
                    ? allFeatures.features[0] // première feature restante, ou undefined si vide
                    : allFeatures.features.at(-1); // dernière feature modifiée

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
            console.log('Normalized data to save:', normalizedData);
            this.fieldStore.save(normalizedData);
        }
    }

    /**
     * Setup conditional controls based on feature type during drag/edit operations
     */
    _setupConditionalControls() {
        if (!this.options.isGeneric) {
            return; // Pas besoin de logique conditionnelle pour les modes spécifiques
        }

        // Intercepter les événements de début de drag
        this.map.on('gm:dragstart', (event) => {
            console.log('Drag start event:', event);

            const geoJson = event?.feature ? this._getGeoJson(event.feature) : null;
            if (!geoJson) {
                console.warn('Could not extract GeoJSON from dragged feature');
                return;
            }

            const geometryType = geoJson.geometry?.type;
            if (geometryType !== 'Point') {
                // Empêcher le drag pour les non-points en mode générique
                console.log('Blocking drag for non-point geometry:', geometryType);
                 // Utiliser la nouvelle méthode du DrawControlManager
                this.drawManager.applyConditionalControls(geometryType);
            }

            console.log('Allowing drag for Point geometry');
        });

        // Intercepter les événements de début d'édition
        this.map.on('gm:editstart', (event) => {
            console.log('Edit start event:', event);

            const geoJson = event?.feature ? this._getGeoJson(event.feature) : null;
            if (!geoJson) {
                console.warn('Could not extract GeoJSON from edited feature');
                return;
            }

            const geometryType = geoJson.geometry?.type;
            if (geometryType === 'Point') {
                // Empêcher l'édition pour les points en mode générique
                console.log('Blocking edit for Point geometry');
                // Utiliser la nouvelle méthode du DrawControlManager
                this.drawManager.applyConditionalControls(geometryType);
            }

            console.log('Allowing edit for non-point geometry:', geometryType);
        });
    }

    _setupGeomanEvents() {
        // Attendre que Geoman soit complètement chargé
        this.map.on("gm:loaded", () => {
            const geoman = this.drawManager.getGeoman();
            if (!geoman) {
                console.error('Geoman instance is not available');
                return;
            }

            console.log('Geoman loaded, setting up events and conditional controls');

            // Setup conditional controls for generic mode
            this._setupConditionalControls();

            // Unified event handlers using the refactored method
            this.map.on('gm:create', (event) => {
                console.log('Feature created');
                this._processAndSaveGeometry(event);
            });

            this.map.on('gm:editend', (event) => {
                console.log('Feature edited');
                this._processAndSaveGeometry(event);
            });

            this.map.on('gm:dragend', (event) => {
                console.log('Feature dragged');
                this._processAndSaveGeometry(event);
            });

            this.map.on('gm:remove', (event) => {
                console.log('Feature removed');
                this._processAndSaveGeometry(event);
            });
        });
    }
}