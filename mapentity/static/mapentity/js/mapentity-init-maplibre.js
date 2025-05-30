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
    });

    // Bounds pour la carte
    const bounds = [window.SETTINGS.map.maplibreConfig.BOUNDS[0], window.SETTINGS.map.maplibreConfig.BOUNDS[1]];

    // Instancier la carte
    const myMap = new MaplibreMap('mainmap', bounds);

    // Initialiser la couche d'objets
    objectsLayer.initialize(myMap.getMap());

    // Ajouter une couche de fond OSM
    window.SETTINGS.map.maplibreConfig.TILES.forEach((tile) => {
            const [tileName, tileUrl, tileAttribution] = tile;
            objectsLayer.addBaseLayer(tileName, {
                id: tileName + '-base',
                tiles: [tileUrl],
                attribution: tileAttribution
            });
        });

    // Sélectionneur unique défini globalement
    const selectorOnce = (() => {
        let current = { 'pk': null, 'row': null };

        const toggleSelectRow = (prevRow, nextRow) => {
            const animateRow = (row, adding) => {
                if (!row) return;
                row.style.display = 'none';
                setTimeout(() => {
                    row.style.display = '';
                    row.classList.toggle('success', adding);
                }, 100);
            };

            animateRow(prevRow, false);
            animateRow(nextRow, true);
        };

        const toggleSelectObject = (pk, on = true) => {
            console.log('toggleSelectObject', pk);
            objectsLayer.select(pk, on);
        };

        return {
            select: (pk, row) => {
                if (pk === current.pk) {
                    pk = null;
                    row = null;
                }

                const prev = current;
                current = { pk, row };

                toggleSelectRow(prev.row, row);

                if (prev.pk && prev.row) toggleSelectObject(prev.pk, false);
                if (row && pk) toggleSelectObject(pk, true);
            }
        };
    })();


    // Initialisation du DataTable
    const mainDatatable = new DataTable('#objects-list', {
        processing: true,
        serverSide: true,
        columnDefs: [
            { visible: false, targets: [0] }
        ],
        ajax: {
            url: `/api/${modelName}/drf/${modelName}s.datatables`
        },
        responsive: true,
        pageLength: 7,
        scrollY: '100vh',
        scrollCollapse: true,
        lengthChange: false,
        language: {
            paginate: {
                first: "<<",
                last: ">>",
                next: ">",
                previous: "<"
            },
        },
        createdRow: function (row, data, index) {
            const pk = data.id;

            row.addEventListener('mouseenter', () => {
                objectsLayer.highlight(pk);
            });
            row.addEventListener('mouseleave', () => {
                objectsLayer.highlight(pk, false);
            });
            row.addEventListener('click', () => {
                selectorOnce.select(pk, row);
            });
            row.addEventListener('dblclick', () => {
                objectsLayer.jumpTo(pk);
            });
        }
    });

    // Une fois la carte chargée
    myMap.getMap().on('load', () => {

        // Charger dynamiquement les objets depuis le backend en utilisant la méthode load
        objectsLayer.load(layerUrl);

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

        // Gestion de History
        const history = new MaplibreMapentityHistory();
        // Gestion des Filtres
         const togglableFiltre = new MaplibreMapentityTogglableFiltre();
        // Initialisation de la synchronisation de la carte avec la table
        const mapsync = new MaplibreMapListSync(mainDatatable, myMap.getMap(),
            objectsLayer, togglableFiltre, history);

        // Charge le formulaire de filtre au premier clic sur le bouton
        togglableFiltre.button.addEventListener('click', function (e) {
            console.log('Chargement du formulaire de filtre');
            togglableFiltre.load_filter_form(mapsync);
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
        // myMap.getMap().on('moveend', function() {
        //     const currentBounds = myMap.getMap().getBounds();
        //     if (!currentBounds.contains(bounds[0]) || !currentBounds.contains(bounds[1])) {
        //         myMap.getMap().fire('reset-view');
        //     }
        // });
    });
});
