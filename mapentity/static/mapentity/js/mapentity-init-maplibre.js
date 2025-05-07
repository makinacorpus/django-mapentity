document.addEventListener('DOMContentLoaded', () => {

        // Instancier la carte
        const myMap = new MaplibreMap('map');
        // Attendre que la carte soit chargée avant d'ajouter les couches
        myMap.getMap().on('load', () => {
            // Test base layer (à activer dans addBaseLayer manuellement avec "visibility": "visible" si besoin)
            myMap.addBaseLayer('OSM', {
                id: 'osm-base',
                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                attribution: '&copy; OpenStreetMap contributors'
            });
            // Test overlay
            const sampleGeoJson = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [-0.15, 51.5],
                                    [-0.15, 51.51],
                                    [-0.13, 51.51],
                                    [-0.13, 51.5],
                                    [-0.15, 51.5]
                                ]
                            ]
                        },
                        "properties": {}
                    }
                ]
            };

            myMap.addOverlay("Zone A", sampleGeoJson, "Zones Test");

            // Ajouter le contrôle personnalisé
        const layerSwitcher = new LayerSwitcherControl(myMap);
        myMap.getMap().addControl(layerSwitcher, 'top-right');

        // Bounds pour le contrôle de réinitialisation
        bounds = [[-180, -90], [180, 90]];
        // Ajouter le contrôle de réinitialisation de la vue
        myMap.getMap().addControl(new ResetMapLibreViewControl(bounds), 'top-left');

        });
});