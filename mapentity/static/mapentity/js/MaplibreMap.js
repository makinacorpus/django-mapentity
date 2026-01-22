class MaplibreMap {
    /**
     * Classe MaplibreMap pour initialiser une carte MapLibre GL JS.
     * @param {string} id - L'ID du conteneur de la carte.
     * @param {Array} center - Les coordonnées [longitude, latitude] du centre de la carte.
     * @param {number} zoom - Le niveau de zoom initial de la carte.
     * @param {number} maxZoom - Le niveau maximal de zoom de la carte.
     * @param {Array} bounds - Les limites de la carte sous forme de [SW, NE] [[lon1, lat1], [lon2, lat2]].
     * @param {string} scale - L'unité de mesure pour le contrôle d'échelle ('metric' ou 'imperial').
     */
    constructor(id, center, zoom, maxZoom, bounds, scale = 'metric') {
        this.id = id;
        this.center = center ;
        this.zoom = zoom ;
        this.bounds = bounds;
        this.scale = scale ;
        this.max_zoom = maxZoom;
        this.map = null;
        this.container = null;
        this._init();
    }

    /**
     * Initialise la carte MapLibre GL JS.
     * @private
     */
    _init() {
        const mapContainer = document.getElementById(this.id);
        this.container = mapContainer;
        if (!mapContainer) {
            console.error(`Map container with id ${this.id} not found.`);
            return;
        }

        const localeLanguage = {
            'AttributionControl.ToggleAttribution': gettext('Toggle attribution'),
            'FullscreenControl.Enter': gettext('Enter fullscreen'),
            'FullscreenControl.Exit': gettext('Exit fullscreen'),
            'GeolocateControl.FindMyLocation': gettext('Find my location'),
            'GeolocateControl.LocationNotAvailable': gettext('Location not available'),
            'NavigationControl.ResetBearing': gettext('Reset bearing to north'),
            'NavigationControl.ZoomIn': gettext('Zoom in'),
            'NavigationControl.ZoomOut': gettext('Zoom out'),
        };

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
            maxZoom: this.max_zoom,
            maxBounds: this.bounds,
            locale: localeLanguage,
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

    /**
     * Recupère l'instance de la carte MapLibre GL JS.
     * @return {maplibregl.Map|null} - L'instance de la carte ou null si non initialisée.
     */
    getMap() {
        return this.map;
    }

    /**
     * Récupère le conteneur de la carte.
     * @return {HTMLElement|null} - Le conteneur de la carte ou null si non initialisé.
     */
    getContainer() {
        return this.container;
    }

}
