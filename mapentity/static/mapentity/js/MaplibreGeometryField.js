class MaplibreGeometryField {
    static unsavedText = 'Map geometry is unsaved';

    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {
            ...options,
        };
        // Détecter les types de géométrie
        const geomType = (this.options.geomType).toLowerCase();
        this.options.isLineString = /linestring$/.test(geomType) || this.options.isGeneric;
        this.options.isPolygon = /polygon$/.test(geomType) || this.options.isGeneric;
        this.options.isPoint = /point$/.test(geomType) || this.options.isGeneric;

        // Initialiser les composants
        this.dataManager = new GeometryDataManager(this.options);
        this.fieldStore = new MaplibreFieldStore(this.fieldId, this.options);

        this.liveDistancePopup = null;
        this.isDrawingLine = false;

        this.map = map;
        this.drawManager = new MaplibreDrawControlManager(map, this.options);
        this.currentMarker = null;
        this._setupDrawEvents();

        // Configurer le callback pour les changements de mode
        this.drawManager.setOnModeChange((mode) => {
            this._handleModeChange(mode);
        });
    }

    _handleModeChange(mode) {
        if (mode === 'draw_line_string') {
            this.isDrawingLine = true;

            // Créer la popup vide pour la distance
            this.liveDistancePopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup',
                offset: 10
            }).setLngLat([0, 0]) // coordonnée temporaire
              .setHTML('0.00 km')
              .addTo(this.map);

            // Commencer le suivi en temps réel dès qu'on entre en mode dessin
            this._startLiveTracking();
        } else {
            this.isDrawingLine = false;
            if (this.liveDistancePopup) {
                this.liveDistancePopup.remove();
                this.liveDistancePopup = null;
            }
            this._stopLiveTracking();
        }
    }

    _startLiveTracking() {
        const draw = this.drawManager.getDraw();

        // Suivre le mouvement de la souris pendant le dessin
        this._mouseMoveHandler = (e) => {
            if (!this.isDrawingLine || !this.liveDistancePopup) return;

            const drawnFeatures = draw.getAll().features;
            const currentLine = drawnFeatures.find(f => f.geometry.type === 'LineString');

            if (currentLine && currentLine.geometry.coordinates.length >= 1) {
                const coords = [...currentLine.geometry.coordinates];
                // Ajouter la position actuelle de la souris
                coords.push([e.lngLat.lng, e.lngLat.lat]);

                const tempLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    }
                };

                const distance = turf.length(tempLine, { units: 'kilometers' });
                const formattedDistance = `${distance.toFixed(2)} km`;

                // Afficher la popup à la position de la souris
                this.liveDistancePopup.setLngLat(e.lngLat).setHTML(formattedDistance);
            } else {
                // Pas encore de points, afficher 0.00 km
                this.liveDistancePopup.setLngLat(e.lngLat).setHTML('0.00 km');
            }
        };

        this.map.on('mousemove', this._mouseMoveHandler);
    }

    _stopLiveTracking() {
        if (this._mouseMoveHandler) {
            this.map.off('mousemove', this._mouseMoveHandler);
            this._mouseMoveHandler = null;
        }
    }

     _setupDrawEvents() {
        // Attendre que draw soit bien disponible
        const draw = this.drawManager.getDraw();
        if (!draw) {
            console.error('Draw instance is not available');
            return;
        }

        // Suppression finale de la popup à la fin du dessin
        this.map.on('draw.create', (e) => {
            if (this.liveDistancePopup) {
                this.liveDistancePopup.remove();
                this.liveDistancePopup = null;
            }
            this.isDrawingLine = false;
            this._stopLiveTracking();

            const newFeature = e.features[0];
            const draw = this.drawManager.getDraw();

            console.log(newFeature.geometry.type);

            // Supprimer les géométries existantes du même type avant d'ajouter la nouvelle
            draw.getAll().features.forEach(f => {
                if (f.geometry.type === newFeature.geometry.type && f.id !== newFeature.id) {
                    draw.delete(f.id);
                }
            });

            // Normalisation, sauvegarde
            const featureCollection = this.dataManager._normalizeToFeatureCollection(newFeature);
            this.fieldStore.save(featureCollection);

            // Traitement spécifique pour les Points (marker rouge)
            if (newFeature.geometry.type === 'Point') {
                draw.changeMode('simple_select');

                const coords = newFeature.geometry.coordinates;
                if (this.currentMarker) this.currentMarker.remove();

                this.currentMarker = new maplibregl.Marker({ color: 'red' })
                    .setLngLat(coords)
                    .addTo(this.map);
            }
        });


        this.map.on('draw.update', (e) => {
            console.log('draw.update event triggered', e);

            const newFeature = e.features[0];
            console.log('New feature update:', newFeature);

            // normaliser la nouvelle feature en feature collection
            const featureCollection = this.dataManager._normalizeToFeatureCollection(newFeature);
            console.log('Normalized feature collection:', featureCollection);

            // Sauvegarder dans le champ du formulaire
            this.fieldStore.save(featureCollection);
        });

        // draw.delete
        this.map.on('custom.draw.delete', (e) => {
            console.log('draw.delete event triggered', e);
            // Supprimer marker si un point a été supprimé
            if (this.currentMarker) {
                    this.currentMarker.remove();
                    this.currentMarker = null;
            }
        });
    }
}