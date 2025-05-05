class MaplibreMap {
    constructor(id) {
        this.id = id;
        this.map = null;
        this.resetViewControl = null;
        this.layers = {
            baseLayers : {},
            overlays : {}
        };

        this._init();
    }

    _init() {
        const mapContainer = document.getElementById(this.id);
        if(!mapContainer) {
            console.error(`Map container with id ${this.id} not found.`);
            return;
        }

         // const center = container.dataset.center ? JSON.parse(container.dataset.center) : [0, 0];
        // const zoom = container.dataset.zoom ? parseFloat(container.dataset.zoom) : 2;
        // const bounds = container.dataset.mapextent ? JSON.parse(container.dataset.mapextent) : null;

        this.map = new maplibregl.Map({
            container: this.id,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [0, 0],
            zoom: 2,
            extent : (-180, -90, 180, 90)
        });

        // add base control
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');

        // add scale control
        const scale = new maplibregl.ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        });
        this.map.addControl(scale, 'bottom-left');

         // Ajouter le calque contrôle personnalisé
        // const layerSwitcher = new LayerSwitcherControl(map);
        // this.map.getMap().addControl(layerSwitcher, 'top-right');
        // this.map.addControl(new LayerSwitcherControl(), 'top-right');

    }

    //  Ajoute un fond de carte raster (base layer)
    addBaseLayer(name, layerConfig) {
        const { id, tiles, tileSize = 256, attribution = '' } = layerConfig; // destructuration de layerConfig

        this.map.addSource(id, {
            type: 'raster',
            tiles: tiles, // Exemple : ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png']
            tileSize,
            attribution
        });

        this.map.addLayer({
            id,
            type: 'raster',
            source: id,
            layout: { visibility: 'none' } // désactivé par défaut
        });

        this.layers.baseLayers[name] = id;

        //  FUTUR appel d’API :
        // fetch('/api/basemaps').then(res => res.json()).then(basemaps => {
        //     basemaps.forEach(b => this.addBaseLayer(b.name, b.config));
        // });
    }

    //  Ajoute un calque GeoJSON (overlay), avec catégorie
    addOverlay(name, geojsonData, category = 'Autres') {
        const sourceId = `overlay-${name}`;
        const layerId = `layer-${name}`;

        this.map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData
        });

        this.map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            layout: {},
            paint: {
                'fill-color': '#088',
                'fill-opacity': 0.5
            }
        });

        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }
        this.layers.overlays[category][name] = layerId;

        // FUTUR appel d’API pour les overlays :
        // fetch('/api/geojson/overlay1').then(res => res.json()).then(data => {
        //     map.addOverlay("Batiments", data, "Structures");
        // });
    }

    // Méthode utilitaire pour changer la visibilité
    toggleLayer(layerId, visible = true) {
        this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    getMap() {
        return this.map;
    }

    getLayers() {
        return this.layers;
    }
}