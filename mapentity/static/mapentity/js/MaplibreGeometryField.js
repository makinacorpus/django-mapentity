
class MaplibreGeometryField {
    static unsavedText = 'Map geometry is unsaved';

    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = { ...options };

        // Détecter les types de géométrie
        const geomType = (this.options.geomType).toLowerCase();
        // this.options.isGeneric = /geometry/.test(geomType);
        // this.options.isCollection = /(^multi|collection$)/.test(geomType);
        this.options.isLineString = /linestring$/.test(geomType) || this.options.isGeneric;
        this.options.isPolygon = /polygon$/.test(geomType) || this.options.isGeneric;
        this.options.isPoint = /point$/.test(geomType) || this.options.isGeneric;

        // Initialiser les composants
        // this.dataManager = new GeometryDataManager(this.options);
        // this.fieldStore = new MaplibreFieldStore(this.fieldId, this.options);

        this.map = map;
        this.drawManager = new MaplibreDrawControlManager(map, this.options);
        this.currentMarker = null;
        this._setupDrawEvents();

        // this._setupBeforeUnload();
        console.log('MaplibreGeometryField initialized for type:', this.options.geomType, this.options);
    }

    // _setupBeforeUnload() {
    //     const _beforeunload = window.onbeforeunload;
    //     window.onbeforeunload = (e) => {
    //         if (this._unsavedChanges) return MaplibreGeometryField.unsavedText;
    //         if (typeof _beforeunload === 'function') return _beforeunload(e);
    //     };
    // }

     _setupDrawEvents() {
        // Attendre que draw soit bien disponible
        const draw = this.drawManager.getDraw();
        if (!draw) {
            console.error('Draw instance is not available');
            return;
        }

        // draw.create
        this.map.on('draw.create', (e) => {
            console.log('draw.create event triggered', e);

            const newFeature = e.features[0];

            // Si ce n’est pas un Point, ne rien faire de plus → laisser le comportement par défaut
            if (newFeature.geometry.type !== 'Point') {
                console.log('draw.create ignoré (géométrie non-Point)');
                return;
            }

            //  Comportement personnalisé pour Point uniquement

            // Supprimer tous les autres points sauf le nouveau
            draw.getAll().features.forEach(f => {
                if (f.geometry.type === 'Point' && f.id !== newFeature.id) {
                    draw.delete(f.id);
                }
            });

            // Changer le mode après création - mode suppression
            draw.changeMode('simple_select');

            // Gérer le marker rouge
            const coords = newFeature.geometry.coordinates;
            if (this.currentMarker) {
                this.currentMarker.remove();
            }
            this.currentMarker = new maplibregl.Marker({ color: 'red' })
                .setLngLat(coords)
                .addTo(this.map);
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

    // // Charge les données (formulaire ou initialise vide)
    // load() {
    //     console.log('Loading geometry field data for type:', this.options.geomType);
    //
    //     // Essayer de charger depuis le champ du formulaire
    //     const formData = this.fieldStore.load();
    //     let geojsonData;
    //
    //     if (formData) {
    //         // Si on a des données dans le formulaire, les utiliser
    //         geojsonData = this.dataManager.loadFromGeoJSON(formData);
    //         console.log('Loaded from form field:', geojsonData);
    //     } else {
    //         // Sinon, initialiser vide (ready for drawing)
    //         geojsonData = this.dataManager.initializeEmpty();
    //         console.log('Initialized empty FeatureCollection for drawing');
    //     }
    //
    //     // Afficher sur la carte
    //     if (geojsonData && this.drawManager) {
    //         this.drawManager.set(geojsonData);
    //         this._setView(geojsonData);
    //     }
    //
    //     return geojsonData;
    // }
    //
    // _setView(geojsonData) {
    //     if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
    //         console.log('Setting view for geojsonData');
    //         try {
    //             const bbox = turf.bbox(geojsonData);
    //             // this.map.fitBounds(bbox, { padding: 20 });
    //         } catch (e) {
    //             console.warn('Could not fit bounds:', e);
    //         }
    //     }
    // }
    //
    // // Événements de dessin
    // onCreated(e) {
    //     console.log('Feature created:', e);
    //     if (!this.options.isCollection) {
    //         // Limiter à une seule feature si ce n'est pas une collection
    //         const allFeatures = this.drawManager.getAll();
    //         if (allFeatures.features.length > 1) {
    //             this.drawManager.deleteAll();
    //             this.drawManager.set({
    //                 type: 'FeatureCollection',
    //                 features: e.features
    //             });
    //         }
    //     }
    //     this._saveCurrentState();
    // }
    //
    // onEdited(e) {
    //     console.log('Feature edited:', e);
    //     this._saveCurrentState();
    // }
    //
    // onDeleted(e) {
    //     console.log('Feature deleted:', e);
    //     this._saveCurrentState();
    // }
    //
    // _saveCurrentState() {
    //     console.log('Saving current state...');
    //     if (this.drawManager) {
    //         const currentData = this.drawManager.getAll();
    //
    //         // DEBUG: Afficher les données capturées
    //         console.log(' Données dessinées:', currentData);
    //         console.log(' Coordonnées:', currentData.features.map(f => f.geometry.coordinates));
    //
    //         // Mettre à jour le gestionnaire de données
    //         this.dataManager.updateData(currentData);
    //
    //         // Sauvegarder dans le champ du formulaire
    //         this.fieldStore.save(currentData);
    //
    //         // DEBUG: Vérifier la sérialisation
    //         const serializedValue = this.fieldStore.formField?.value;
    //         console.log(' Sérialisé dans textarea:', serializedValue);
    //
    //         this._unsavedChanges = false;
    //     }
    // }
    //
    // // API publique
    // getData() {
    //     return this.dataManager.getData();
    // }
    //
    // setData(geojsonData) {
    //     const normalizedData = this.dataManager.loadFromGeoJSON(geojsonData);
    //     if (this.drawManager) {
    //         this.drawManager.set(normalizedData);
    //         this._setView(normalizedData);
    //     }
    //     this._saveCurrentState();
    //     return normalizedData;
    // }
}