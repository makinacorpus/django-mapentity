class MaplibreGeometryField {
    static unsavedText = 'Map geometry is unsaved';

    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {
            ...options,
        };
        // Détecter les types de géométrie
        const geomType = (this.options.geomType).toLowerCase();
        this.options.isGeneric = /geometrycollection$/.test(geomType);
        // options.is_collection = /(^multi|collection$)/.test(geom_type);
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

            // Vider le draw des éléments précédents avant de commencer un nouveau dessin
            if(!this.options.isGeneric) {
                const draw = this.drawManager.getDraw();
                if (draw) {
                    const allFeatures = draw.getAll().features;
                    if (allFeatures.length > 1) {
                        draw.delete(allFeatures[0].id); // Toujours supprimer le plus ancien
                    }
                }
            }


            // Créer la popup vide pour la distance
            this.livePopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup',
                anchor: 'left',
                offset: 10
            })
              .addTo(this.map);

            // Commencer le suivi en temps réel dès qu'on entre en mode dessin
            this._startLiveLineTracking();
        }

        if (mode === 'draw_polygon') {
            this.isDrawingPolygon = true;

            if(!this.options.isGeneric) {
                 // Vider le draw des éléments précédents avant de commencer un nouveau dessin
                const draw = this.drawManager.getDraw();
                if (draw) {
                    const allFeatures = draw.getAll().features;
                    if (allFeatures.length > 1) {
                        draw.delete(allFeatures[0].id); // Toujours supprimer le plus ancien
                    }
                }
            }

            // Créer la popup vide pour la distance
            this.livePopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup',
                anchor: 'left',
                offset: 10
            })
              .addTo(this.map);

            // Commencer le suivi en temps réel dès qu'on entre en mode dessin
            this._startLivePolygonTracking();
        }
    }

    _startLiveLineTracking() {
        const draw = this.drawManager.getDraw();

        // Suivre le mouvement de la souris pendant le dessin
        this._mouseMoveHandler = (e) => {
            if (!this.isDrawingLine || !this.livePopup) {
                return;
            }

            const drawnFeatures = draw.getAll().features;

            const currentLine = drawnFeatures.find(f => f.geometry.type === 'LineString');
            if(!currentLine){
                // Remettre en mode dessin de polygone
                draw.changeMode('draw_line_string');
                return; // Empêcher la suite du traitement
            }

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
                let formattedMessage = '';
                // Déterminer le message en fonction du nombre de points déjà placés
                let message;

                if(currentLine.geometry.coordinates.length === 1) {
                    // Aucun point encore placé, message initial
                    message = 'Cliquer pour commencer le dessin de la ligne';
                    formattedMessage = message;
                } else if (currentLine.geometry.coordinates.length === 2) {
                    // Premier point placé, on peut continuer
                    message = '<br>Cliquer pour continuer le dessin de la ligne';
                    formattedMessage = formattedDistance + message;
                } else {
                    // Plusieurs points déjà placés
                    message = '<br>Cliquer sur le dernier point pour terminer la ligne';
                    formattedMessage = formattedDistance + message;
                }

                // Afficher la popup à la position de la souris
                this.livePopup.setLngLat(e.lngLat).setHTML(formattedMessage);
            }
        };

        this.map.on('mousemove', this._mouseMoveHandler);
    }

    _startLivePolygonTracking() {
        const draw = this.drawManager.getDraw();

        // Suivre le mouvement de la souris pendant le dessin
        this._mouseMoveHandler = (e) => {
            if (!this.isDrawingPolygon || !this.livePopup) {
                return;
            }

            const drawnFeatures = draw.getAll().features;

            const currentPolygon = drawnFeatures.find(f => f.geometry.type === 'Polygon');
            if(!currentPolygon){
                // Remettre en mode dessin de polygone
                draw.changeMode('draw_polygon');
                return; // Empêcher la suite du traitement
            }

            console.log('currentPolygon', currentPolygon);
            console.log('currentPolygon coordinates length', currentPolygon?.geometry.coordinates[0].length);
            if (currentPolygon && currentPolygon.geometry.coordinates[0].length >= 2) {

                const coords = [...currentPolygon.geometry.coordinates[0]];
                // Ajouter la position actuelle de la souris
                coords.push([e.lngLat.lng, e.lngLat.lat]);
                // Fermer le polygone en ajoutant le premier point à la fin
                coords.push(coords[0]);

                const tempPolygon = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coords]
                    }
                };


                let formattedArea;
                let formattedMessage = '';

                const area = turf.area(tempPolygon); // Aire en mètres carrés
                // Formatage de l'aire selon la taille
                if (area < 10000) { // moins de 1 hectare
                    formattedArea = `${area.toFixed(0)} m²`;
                } else if (area < 1000000) { // moins de 1 km²
                    formattedArea = `${(area / 10000).toFixed(2)} ha`;
                } else {
                    formattedArea = `${(area / 1000000).toFixed(2)} km²`;
                }

                let message;

                if(currentPolygon.geometry.coordinates[0].length === 2) {
                    // Aucun point encore placé, message initial
                    message = 'Cliquer pour commencer le dessin de la forme';
                    formattedMessage = message;
                } else if (currentPolygon.geometry.coordinates[0].length === 3 || currentPolygon.geometry.coordinates[0].length === 4) {
                    // Premier point placé, on peut continuer
                    message = '<br>Cliquer pour continuer le dessin de la forme';
                    formattedMessage =formattedArea + message;
                } else {
                    // Plusieurs points déjà placés
                    message = '<br>Cliquer sur le dernier point pour terminer la forme';
                    formattedMessage =formattedArea + message;
                }

                // Afficher la popup à la position de la souris
                this.livePopup.setLngLat(e.lngLat).setHTML(formattedMessage);
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

     // Extrait de la méthode _setupDrawEvents() mise à jour

    _setupDrawEvents() {
        // Attendre que draw soit bien disponible
        const draw = this.drawManager.getDraw();
        if (!draw) {
            console.error('Draw instance is not available');
            return;
        }

        // Suppression finale de la popup à la fin du dessin
        this.map.on('draw.create', (e) => {
            const newFeature = e.features[0];
            const draw = this.drawManager.getDraw();

            if (this.livePopup) {
                this.livePopup.remove();
                this.livePopup = null;
            }
            this.isDrawingLine = false;
            this.isDrawingPolygon = false;
            this._stopLiveTracking();

            // Supprimer les géométries existantes du même type avant d'ajouter la nouvelle
            if(!this.options.isGeneric) {
                draw.getAll().features.forEach(f => {
                    if (f.geometry.type === newFeature.geometry.type && f.id !== newFeature.id) {
                        draw.delete(f.id);
                    }
                });
            }

            // Récupérer toutes les features du draw
            const allFeatures = draw.getAll().features;
            console.log('All features from draw:', allFeatures);

            // Construire la structure appropriée selon les options
            let normalizedData;

            if (this.options.isGeneric) {
                // Mode générique : créer une GeometryCollection avec toutes les géométries
                normalizedData = this.dataManager.normalizeToGeometryCollection(allFeatures);
            } else {
                 if (this.options.isLineString || this.options.isPolygon || this.options.isPoint) {
                     normalizedData = this.dataManager.normalizeToFeatureCollection(newFeature);
                 }
            }

            // Sauvegarder si des données ont été normalisées
            if (normalizedData) {
                console.log('Normalized data to save:', normalizedData);
                this.fieldStore.save(normalizedData);
            }

            // Traitement spécifique pour les Points (marker rouge)
            if (newFeature.geometry.type === 'Point') {
                draw.changeMode('simple_select');

                const coords = newFeature.geometry.coordinates;
                if(!this.options.isGeneric) {
                    if (this.currentMarker) {
                        this.currentMarker.remove();
                    }
                }

                this.currentMarker = new maplibregl.Marker({ color: 'red' })
                    .setLngLat(coords)
                    .addTo(this.map);
            }
        });

        this.map.on('draw.update', (e) => {
            console.log('draw.update event triggered', e);

            const draw = this.drawManager.getDraw();
            const allFeatures = draw.getAll().features;
            console.log('All features from draw (update):', allFeatures);

            // Construire la structure appropriée selon les options
            let normalizedData;

            if (this.options.isGeneric) {
                // Mode générique : créer une GeometryCollection avec toutes les géométries
                normalizedData = this.dataManager.normalizeToGeometryCollection(allFeatures);
            } else {
                // Mode spécifique : normaliser la feature mise à jour
                if( this.options.isLineString || this.options.isPolygon || this.options.isPoint) {
                    const updatedFeature = e.features[0];
                    normalizedData = this.dataManager.normalizeToFeatureCollection(updatedFeature);
                }
            }

            // Sauvegarder si des données ont été normalisées
            if (normalizedData) {
                console.log('Normalized data to save (update):', normalizedData);
                this.fieldStore.save(normalizedData);
            }
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