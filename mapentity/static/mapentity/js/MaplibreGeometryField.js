// Classe principale pour la gestion des champs géométriques
class MaplibreGeometryField {
    static unsavedText = 'Map geometry is unsaved';

    constructor(options = {}) {
        this.options = {
            fieldStoreClass: MaplibreFieldStore,
            modifiable: true,
            ...options
        };

        const geomType = (this.options.geomType || '').toLowerCase();
        this.options.isGeneric = /geometry/.test(geomType);
        this.options.isCollection = /(^multi|collection$)/.test(geomType);
        this.options.isLineString = /linestring$/.test(geomType) || this.options.isGeneric;
        this.options.isPolygon = /polygon$/.test(geomType) || this.options.isGeneric;
        this.options.isPoint = /point$/.test(geomType) || this.options.isGeneric;

        this._unsavedChanges = false;
        this._setupBeforeUnload();
    }

    _setupBeforeUnload() {
        const _beforeunload = window.onbeforeunload;
        window.onbeforeunload = (e) => {
            if (this._unsavedChanges) return MaplibreGeometryField.unsavedText;
            if (typeof _beforeunload === 'function') return _beforeunload(e);
        };
    }

    addTo(map) {
        this.map = map;
        this.store = new this.options.fieldStoreClass(this.options.fieldId, this.options);

        if (this.options.modifiable) {
            this.drawManager = new DrawControlManager(map, this.options);

            map.on('draw.create', (e) => this.onCreated(e));
            map.on('draw.update', (e) => this.onEdited(e));
            map.on('draw.delete', (e) => this.onDeleted(e));

            map.on('draw.modechange', (e) => {
                if (e.mode === 'draw_line_string' || e.mode === 'draw_polygon' || e.mode === 'draw_point') {
                    this._unsavedChanges = true;
                }
            });
        }

        this.load();
        map.fire('map:loadfield', { field: this, fieldId: this.options.fieldId });
        return this;
    }

    load() {
        const geojsonData = this.store.load();
        if (geojsonData && this.drawManager) {
            this.drawManager.set(geojsonData);
            this._setView(geojsonData);
        }
        return geojsonData;
    }

    _setView(geojsonData) {
        if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
            // Utiliser turf.js pour calculer les bounds si disponible
            if (typeof turf !== 'undefined' && turf.bbox) {
                try {
                    const bbox = turf.bbox(geojsonData);
                    this.map.fitBounds(bbox, { padding: 20 });
                } catch (e) {
                    console.warn('Could not fit bounds:', e);
                }
            }
        }
    }

    onCreated(e) {
        if (!this.options.isCollection) {
            // Supprimer les autres features si ce n'est pas une collection
            const allFeatures = this.drawManager.getAll();
            if (allFeatures.features.length > 1) {
                this.drawManager.deleteAll();
                // Garder seulement la nouvelle feature
                this.drawManager.set({
                    type: 'FeatureCollection',
                    features: e.features
                });
            }
        }
        this._saveCurrentState();
    }

    onEdited(e) {
        this._saveCurrentState();
    }

    onDeleted(e) {
        this._saveCurrentState();
    }

    _saveCurrentState() {
        if (this.drawManager) {
            const currentData = this.drawManager.getAll();
            this.store.save(currentData.features);
            this._unsavedChanges = false;
        }
    }
}