document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des URLs dynamiques
    const modelName = 'dummymodel';  // à adapter dynamiquement
    const objectUrlTemplate = window.SETTINGS.urls.detail.replace(/modelname/g, modelName);
    const layerUrl = window.SETTINGS.urls.layer.replace(/modelname/g, modelName);

    // Définir une fonction pour générer les URLs de détails d’un objet
    const getObjectUrl = (properties) => {
        return objectUrlTemplate.replace('0', properties.id);
    };

    // Récupérer le style défini dans les settings (ou fallback)
    let style = window.SETTINGS.map.styles[modelName] || window.SETTINGS.map.styles.others;
    if (typeof style !== "function") {
        style = { ...style };  // créer une copie propre
    }

    console.log("Style:", style);
    // Créer une instance de MaplibreObjectsLayer
    const objectsLayer = new MaplibreObjectsLayer(null, {
        objectUrl: getObjectUrl,
        style: style,
        modelname: modelName,
        indexing: true,
        highlight: true,
        // onEachFeature: function (geojson, layer) {
        //     if (geojson.properties.name) {
        //         layer.bindPopup(geojson.properties.name);
        //     }
        // }
    });

    // Instancier la carte
    const myMap = new MaplibreMap('map');
    myMap.setObjectsLayer(objectsLayer, myMap);

    // Une fois la carte chargée
    myMap.getMap().on('load', () => {
        // Ajouter une couche de fond OSM
        objectsLayer.addBaseLayer('OSM', {
            id: 'osm-base',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '&copy; OpenStreetMap contributors'
        });

        // Charger dynamiquement les objets depuis le backend en utilisant la méthode load
        objectsLayer.load(layerUrl);

        // Contrôle pour changer les couches
        const layerSwitcher = new MaplibreLayerControl(myMap);
        myMap.getMap().addControl(layerSwitcher, 'top-right');

        // Ajouter un contrôle pour réinitialiser la vue
        const bounds = [[-180, -90], [180, 90]];
        myMap.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');


        // MaplibreFileLayerControl
        var pointToLayer = function (feature, latlng) {
            return L.circleMarker(latlng, {style: window.SETTINGS.map.styles.filelayer})
                    .setRadius(window.SETTINGS.map.styles.filelayer.radius);
        },
        onEachFeature = function (feature, layer) {
            // Ajoute une étiquette si l'objet a un nom
            // if (feature.properties.name) {
            //     layer.bindLabel(feature.properties.name);
            // }
        };

        const fileLayerLoadControl = new MaplibreFileLayerControl({
            layerOptions: {
                style: window.SETTINGS.map.styles.filelayer,
                pointToLayer: pointToLayer,
                onEachFeature: onEachFeature
            }
        });
        myMap.getMap().addControl(fileLayerLoadControl, 'top-left');
    });
});
