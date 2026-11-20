class MaplibreMap {
    /**
     * MaplibreMap class to initialize a MapLibre GL JS map.
     * @param {string} id - The ID of the map container.
     * @param {Array} center - The [longitude, latitude] coordinates of the map center.
     * @param {number} zoom - The initial zoom level of the map.
     * @param {number} maxZoom - The maximum zoom level of the map.
     * @param {Array} bounds - The map bounds as [SW, NE] [[lon1, lat1], [lon2, lat2]].
     * @param {string} scale - The unit of measurement for the scale control ('metric' or 'imperial').
     * @param {number} [minZoom=1] - The minimum zoom level of the map.
     */
    constructor(id, center, zoom, maxZoom, bounds, scale = 'metric', minZoom = 1) {
        this.id = id;
        this.center = center ;
        this.zoom = zoom ;
        this.bounds = bounds;
        this.scale = scale ;
        this.max_zoom = maxZoom;
        this.min_zoom = minZoom;
        this.map = null;
        this.container = null;
        this._init();
    }

    /**
     * Initialize the MapLibre GL JS map.
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
            minZoom: this.min_zoom,
            maxBounds: this.bounds,
            locale: localeLanguage,
        });

        // Ajouter les contrôles standards
        this.map.addControl(this._createNavigationControl(), 'top-left');
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
     * Create NavigationControl with zoom buttons disabled at effective min/max zoom
     * (including constraints imposed by maxBounds).
     * @return {maplibregl.NavigationControl}
     * @private
     */
    _createNavigationControl() {
        const navControl = new maplibregl.NavigationControl();
        const updateZoomButtons = () => {
            if (!navControl._map || !navControl._zoomInButton || !navControl._zoomOutButton) {
                return;
            }
            const map = navControl._map;
            const zoom = map.getZoom();
            const epsilon = 1e-5;
            let isMax = zoom >= map.getMaxZoom() - epsilon;
            let isMin = zoom <= map.getMinZoom() + epsilon;

            if (map.transform && typeof map.transform.applyConstrain === 'function') {
                const center = map.getCenter();
                const probeDelta = 0.01;
                const constrainedIn = map.transform.applyConstrain(center, zoom + probeDelta).zoom;
                const constrainedOut = map.transform.applyConstrain(center, zoom - probeDelta).zoom;
                isMax = isMax || (constrainedIn - zoom <= epsilon);
                isMin = isMin || (zoom - constrainedOut <= epsilon);
            }

            navControl._zoomInButton.disabled = isMax;
            navControl._zoomOutButton.disabled = isMin;
            navControl._zoomInButton.setAttribute('aria-disabled', isMax.toString());
            navControl._zoomOutButton.setAttribute('aria-disabled', isMin.toString());
        };

        navControl._updateZoomButtons = updateZoomButtons;
        const origOnAdd = navControl.onAdd.bind(navControl);
        navControl.onAdd = (map) => {
            const container = origOnAdd(map);
            map.on('zoomend', updateZoomButtons);
            map.on('resize', updateZoomButtons);
            map.once('load', updateZoomButtons);
            return container;
        };
        const origOnRemove = navControl.onRemove.bind(navControl);
        navControl.onRemove = () => {
            if (navControl._map) {
                navControl._map.off('zoomend', updateZoomButtons);
                navControl._map.off('resize', updateZoomButtons);
                navControl._map.off('load', updateZoomButtons);
            }
            return origOnRemove();
        };

        return navControl;
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
