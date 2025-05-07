class MaplibreMap {
       constructor(id) {
        this.id = id;
        this.map = null;
        this.layers = {
            baseLayers: {},
            overlays: {}
        };

        this._init();
    }

    _init() {
        const mapContainer = document.getElementById(this.id);
        if(!mapContainer) {
            console.error(`Map container with id ${this.id} not found.`);
            return;
        }

        //  Initialisation de la carte
        this.map = new maplibregl.Map({
            container: this.id,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [2.3522, 48.8566],
            zoom: 8,
        });

        // add base control
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-left');

        // Création et ajout du contrôleur de mesure
        const measureControl = new MeasureMaplibreControl();
        this.map.addControl(measureControl, 'top-left');

        // add scale control
        const scale = new maplibregl.ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        });
        this.map.addControl(scale, 'bottom-left');
        // scale.setUnit('imperial'); // imperial ou metric, imperial -> miles, metric -> km

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