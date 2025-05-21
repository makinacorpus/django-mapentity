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

    // Bounds pour la carte
    const bounds = [[-3.630430, 40.120372], [3.208008, 45.061882]];

    // Instancier la carte
    const myMap = new MaplibreMap('mainmap', bounds);

    // Initialiser la couche d'objets
    objectsLayer.initialize(myMap.getMap());

    // Initialiser la table de données principale
    const mainDatatable = new DataTable('#objects-list', {
        'processing': true,
        'serverSide': true,
        columnDefs: [
            { "visible": false, "targets": [0] },  // don't show first column (ID)
        ],
        "ajax": {
            "url": `/api/${modelName}/drf/${modelName}s.datatables`
        },
        responsive: true,
        pageLength: 7, // page size is computed from the window size - expandDatatableHeight()
        scrollY: '100vh',
        scrollCollapse: true,
        "lengthChange": false, // disable page length selection
        "language": {
            "paginate": {
                "first": "<<",
                "last": ">>",
                "next": ">",
                "previous": "<"
            },
        },
        createdRow: function (row, data, index) {
            // Highlight feature on map on row hover
            const pk = data.id;
            row.addEventListener('mouseenter', () => {
                objectsLayer.highlight(pk);
            });
            row.addEventListener('mouseleave', () => {
                objectsLayer.highlight(pk, false);
            });
        }
    });

    var context = document.body.dataset;
    console.log('context : ', JSON.stringify(context));
    var context2 = document.getElementById('mainmap').dataset;
    console.log('context2 : ', context2);
    var context3 = document.getElementById('detailmap')?.dataset;
    console.log('context3 : ', context3);
    console.debug('View ', context.modelname, context.viewname);

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

        // Initialisation de la synchronisation de la carte avec la table
        const mapsync = new MaplibreMapListSync(mainDatatable, myMap.getMap(), objectsLayer);

        // Ajouter un contrôle pour réinitialiser la vue
        myMap.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

        const fileLayerLoadControl = new MaplibreFileLayerControl({
            layerOptions: {
                style: window.SETTINGS.map.styles.filelayer,
            }
        });
        myMap.getMap().addControl(fileLayerLoadControl, 'top-left');

        // Contrôle pour changer les couches
        const layerSwitcher = new MaplibreLayerControl(objectsLayer);
        myMap.getMap().addControl(layerSwitcher, 'top-right');

        const context = new MaplibreMapentityContext();

        context.getFullContext(myMap.getMap(), {
            filter: 'mainfilter', // id du formulaire de filtre
            datatable: mainDatatable
        });

        context['selector'] = '#map';
        console.log('context : ', JSON.stringify(context));

        context.saveFullContext(myMap.getMap(), {
            filter: 'mainfilter', // id du formulaire de filtre
            datatable: mainDatatable
        });

        // fire an event when the map is moved
        // myMap.getMap().on("moveend", function () {
        // la construction du rectangle n'est nécessaire que pour le filtre des données.
        // Elle permet de spécifier au back de faire la recherche dans une zone donnée
        //     const rect = new MaplibreRectangle(bounds);
        //     const wkt = rect.getWKT();
        //     // Update the hidden input field with the WKT representation
        //     document.getElementById('id_bbox').value = wkt;
        // });

        // Ensure the map stays within the defined bounds
        myMap.getMap().on('moveend', function() {
            const currentBounds = myMap.getMap().getBounds();
            if (!currentBounds.contains(bounds[0]) || !currentBounds.contains(bounds[1])) {
                myMap.getMap().fire('reset-view');
            }
        });
    });
});
