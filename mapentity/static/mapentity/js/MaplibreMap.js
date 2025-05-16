class MaplibreMap {
    constructor(id, bounds = null) {
        this.id = id;
        this.map = null;
        this.container = null;
        this.bounds = bounds;
        this._init();
    }

    _init() {
        const mapContainer = document.getElementById(this.id);
        this.container = mapContainer;
        if (!mapContainer) {
            console.error(`Map container with id ${this.id} not found.`);
            return;
        }

        // Initialisation de la carte
        this.map = new maplibregl.Map({
            container: this.id,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [1.4442, 43.6045],
            zoom: 6,
        });

        // Ajouter les contrôles standards
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');

        // Contrôle de mesure
        const measureControl = new MaplibreMeasureControl();
        this.map.addControl(measureControl, 'top-left');

        // Contrôle d’échelle
        const scale = new maplibregl.ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        });
        this.map.addControl(scale, 'bottom-left');

        if (this.bounds) {
            this.map.fitBounds(this.bounds, {
                padding: 20,
                linear: true,
                duration: 1000
            });
        }
    }

    getMap() {
        return this.map;
    }

    getContainer() {
        return this.container;
    }

    getBounds() {
        return this.bounds;
    }
}
