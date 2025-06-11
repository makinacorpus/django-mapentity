// // Composition pour les fonctionnalités étendues (équivalent à MapEntityGeometryField)
// class MaplibreMapentityGeometryField {
//     // constructor(fieldId, options = {}) {
//     //     console.log('MaplibreMapentityGeometryField initialized with options:', options);
//     //     this.geometryField = new MaplibreGeometryField(fieldId, options);
//     //     this.options = options;
//     //     // this._initialBounds = bounds;
//     //     // this._resetBounds = null;
//     //     this.map = null;
//     // }
//     //
//     // addTo(map) {
//     //     this.map = map;
//     //     this.geometryField.addTo(map);
//     //     // this._setView();
//     //     return this;
//     // }
//
//     // _setView() {
//     //     // Logique spécifique pour MapEntity
//     //     const geometry = this.geometryField.store.load();
//     //     if (!geometry) {
//     //         // Ici on pourrait restaurer une vue sauvegardée
//     //         // MapEntity.Context.restoreLatestMapView(this.map, ['detail', 'list']);
//     //     }
//     //     // this._initialBounds = this.map.getBounds();
//     //     this._resetBounds = this._initialBounds;
//     // }
//
//     // Délégation des méthodes principales
//     // load() {
//     //     return this.geometryField.load();
//     // }
//
//     // onCreated(e) {
//     //     this.geometryField.onCreated(e);
//     //     // if (!this.options.isPoint || this.geometryField.drawManager.getAll().features.length > 0) {
//     //     //     const bounds = this.map.getBounds();
//     //     //     this._resetBounds = bounds;
//     //     // }
//     //
//     //     // if (this.geometryField.drawManager.getAll().features.length > 0) {
//     //     //     // const bounds = this.map.getBounds();
//     //     //     this._resetBounds = this._initialBounds;
//     //     // }
//     // }
//     //
//     // onDeleted(e) {
//     //     this.geometryField.onDeleted(e);
//     //     // this._resetBounds = this._initialBounds;
//     // }
// }