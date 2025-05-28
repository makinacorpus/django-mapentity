class MaplibreMap {
    constructor(id, boundsInit = null) {
        this.id = id;
        // this.boundsInit = boundsInit;
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

        // Initialisation de la carte
        const [tileName, tileUrl, tileAttribution] = window.SETTINGS.map.maplibreConfig.TILES[0];

        this.map = new maplibregl.Map({
            container: this.id,
            style: {
                version: 8,
                sources: {
                    [tileName.toLowerCase()]: {
                        type: 'raster',
                        tiles: [tileUrl],
                        tileSize: 256,
                        attribution: tileAttribution
                    }
                },
                layers: [
                    {
                        id: `${tileName.toLowerCase()}-layer`,
                        type: 'raster',
                        source: tileName.toLowerCase(),
                    }
                ]
            },
            center: window.SETTINGS.map.maplibreConfig.DEFAULT_CENTER,
            zoom: window.SETTINGS.map.maplibreConfig.DEFAULT_ZOOM
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

        // Si des limites initiales sont fournies, ajuster la vue de la carte
        // if (this.boundsInit) {
        //     this.map.on('load', () => {
        //         this.map.fitBounds(this.boundsInit, { padding: 0 });
        //     });
        // }
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
