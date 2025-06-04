class MaplibreMap {
    constructor(id, mapCenter, mapZoom, mapMaxBounds) {
        this.id = id;
        this.mapCenter = mapCenter ;
        this.mapZoom = mapZoom ;
        this.mapMaxBounds = mapMaxBounds;
        this.map = null;
        this.container = null;
        this.resetViewControl = null; // modifier ceci, mettre en place un objet dans lequel sera stocké tous les controllers ajoutés pour suivre leur trace
        this._init();
    }

    _init() {
        const mapContainer = document.getElementById(this.id);
        this.container = mapContainer;
        if (!mapContainer) {
            console.error(`Map container with id ${this.id} not found.`);
            return;
        }

        this.map = new maplibregl.Map({
            container: this.id,
            center: this.mapCenter,
            zoom: this.mapZoom,
            maxBounds: this.mapMaxBounds,
        });

        // Ajouter les contrôles standards
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');

        // Contrôle de mesure
        const measureControl = new MaplibreMeasureControl();
        this.map.addControl(measureControl, 'top-left');

    }

    getMap() {
        return this.map;
    }

    getContainer() {
        return this.container;
    }

    getResetViewControl() {
        return this.resetViewControl;
    }
}
