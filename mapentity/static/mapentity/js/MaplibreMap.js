class MaplibreMap {
    constructor(id, center, zoom, bounds, scale = 'metric') {
        this.id = id;
        this.center = center ;
        this.zoom = zoom ;
        this.bounds = bounds;
        this.scale = scale ;
        this.map = null;
        this.container = null;
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
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {},
                layers: [],
            },
            center: this.center,
            zoom: this.zoom,
            maxBounds: this.bounds,
        });

        // Ajouter les contrôles standards
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');
        // Contrôle de mesure
        this.map.addControl(new MaplibreMeasureControl(), 'top-left');

         const unit = this.scale;
         const scale = new maplibregl.ScaleControl({
             maxWidth: 80,
             unit: unit
         });

         this.map.addControl(scale, 'bottom-left');
    }

    getMap() {
        return this.map;
    }

    getContainer() {
        return this.container;
    }

}
