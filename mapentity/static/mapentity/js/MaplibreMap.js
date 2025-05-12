class MaplibreMap {
    constructor(id) {
        this.id = id;
        this.map = null;
        this.objectsLayer = null;
        this.container = null;
        this._init();
    }

    _init() {
        const mapContainer = document.getElementById(this.id);
        this.container = mapContainer; // Store the container reference
        if(!mapContainer) {
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

        // add base control
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');

        // Création et ajout du contrôleur de mesure
        const measureControl = new MaplibreMeasureControl();
        this.map.addControl(measureControl, 'top-left');

        // add scale control
        const scale = new maplibregl.ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        });
        this.map.addControl(scale, 'bottom-left');
    }

    getMap() {
        return this.map;
    }

   setObjectsLayer(objectsLayer) {
        this.objectsLayer = objectsLayer;
        this.objectsLayer.initialize(this.map); // Initialiser manuellement la couche
    }

    getObjectsLayer() {
        return this.objectsLayer;
    }
    getContainer() {
        return this.container;
    }
}
