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

    // Créer une instance de MaplibreObjectsLayer
    const objectsLayer = new MaplibreObjectsLayer(null, {
        objectUrl: getObjectUrl,
        style: style,
        modelname: modelName,
        indexing: true,
        highlight: true,
    });

    // bounds pour la carte
    const bounds = [[1.3, 43.7], [1.5, 43.5]];

    // Instancier la carte
    const myMap = new MaplibreMap('map', bounds);

    // Initialiser la couche d'objets
    objectsLayer.initialize(myMap.getMap());

    // Initialiser la table de données principale
    // const mainDatatable = $('#objects-list').DataTable({
    //     'processing': true,
    //     'serverSide': true,
    //     aoColumnDefs: [
    //         { "bVisible": false, "aTargets": [0] },  // don't show first column (ID)
    //     ],
    //     "ajax": {
    //         "url": `/api/${modelName}/drf/${modelName}s.datatables`
    //     },
    //     responsive: true,
    //     pageLength: 7, // page size is computed from the window size - expandDatatableHeight()
    //     scrollY: '100vh',
    //     scrollCollapse: true,
    //     "lengthChange": false, // disable page length selection
    //     "language": {
    //         "paginate": {
    //             "first": "<<",
    //             "last": ">>",
    //             "next": ">",
    //             "previous": "<"
    //         },
    //     },
    //     createdRow: function (row, data, index) {
    //         // highlight feature on map on row hover
    //         var pk = data.id;
    //         $(row).hover(
    //             function () {
    //                 objectsLayer.highlight(pk);
    //             },
    //             function () {
    //                 objectsLayer.highlight(pk, false);
    //             }
    //         );
    //     }
    // });

    // Une fois la carte chargée
    myMap.getMap().on('load', () => {
        // Ajouter une couche de fond OSM
        objectsLayer.addBaseLayer('OSM', {
            id: 'osm-base',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            attribution: '&copy; OpenStreetMap contributors'
        });

        objectsLayer.addBaseLayer('topo', {
            id: 'topo-base',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
            attribution: '&copy; Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap.'
        });

        // Charger dynamiquement les objets depuis le backend en utilisant la méthode load
        objectsLayer.load(layerUrl);

        // Ajouter la couche d'objets à la carte
        // const mapsync = new MaplibreMapListSync(mainDatatable, myMap.getMap(), objectsLayer);

        // Ajouter un contrôle pour réinitialiser la vue

        myMap.getMap().addControl(new MaplibreResetViewControl(), 'top-left');

        const fileLayerLoadControl = new MaplibreFileLayerControl({
            layerOptions: {
                style: window.SETTINGS.map.styles.filelayer,
            }
        });
        myMap.getMap().addControl(fileLayerLoadControl, 'top-left');

        // Contrôle pour changer les couches
        const layerSwitcher = new MaplibreLayerControl(objectsLayer);
        myMap.getMap().addControl(layerSwitcher, 'top-right');
    });
});
