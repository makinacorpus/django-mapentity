// Écouteurs d'événements pour les cartes
document.addEventListener('DOMContentLoaded', function() {

    // Écouteur d'événement pour la vue détail
    window.addEventListener('entity:map:detail', function(e) {
        // console.log('Map initialized for detail view with data:', e.detail);

        const { map, objectsLayer, modelname } = e.detail;


        // Restauration du contexte de la carte, uniquement pour les captures d'écran
        const mapViewContext = getURLParameter('context');

        // if(mapViewContext && typeof mapViewContext === 'object') {
        //     mapViewContext.restoreFullContext(map.getMap(), mapViewContext)
        // }

        window.addEventListener('visibilitychange', function() {
            mapViewContext.saveFullContext(map.getMap(), {prefix: 'detail'});
        });

        // Affichage de la géométrie de l'objet sur la carte de détail
        const feature_geojson_url = document.getElementById('detailmap').getAttribute('data-feature-url');
        // console.log('Feature GeoJSON URL:', feature_geojson_url);

        const fetchFeatureLayer = async (dataUrl) => {
            const reponse = await fetch(dataUrl);
            if (!reponse.ok) {
                console.error('Erreur lors de la récupération des données GeoJSON:', reponse.statusText);
                return;
            }
            const featureData = await reponse.json();
            if (featureData && featureData.type === 'Feature') {
                // console.log('Feature data type retrieved:', featureData.type);

                if (mapViewContext && mapViewContext.print){
                    const specified = window.SETTINGS.map.styles.print[modelname] ;
                    if (specified) {
                        objectsLayer.options.detailStyle = Object.assign({}, objectsLayer.options.detailStyle, specified);
                    }
                }

                // Charger la géométrie de l'objet sur la carte
                objectsLayer.load(feature_geojson_url);

            } else {
                console.warn('No features found in the GeoJSON data.');
            }
        }

        fetchFeatureLayer(feature_geojson_url);

         map.getMap().on('layers:added', () => {
             // Ajouter un contrôle pour réinitialiser la vuer
             const boundsLayer = objectsLayer.getBoundsLayer();
             map.getMap().addControl(new MaplibreResetViewControl(boundsLayer), 'top-left');

             // Bouton de capture d'écran pour la carte
            // En course de développement
            const mapentityContext = window.MapEntity.currentMap.mapentityContext;

            const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
                () => {
                    context = mapentityContext.getFullContext(map.getMap());
                    context['selector'] = '#detailmap';
                    return JSON.stringify(context);
            });
            map.getMap().addControl(screenshotControl, 'top-left');
        });

    });

    // Écouteur d'événement pour la vue liste
    window.addEventListener('entity:map:list', function(e) {
        // console.log('Map initialized for list view with data:', e.detail);
        const { map, objectsLayer, modelname, bounds } = e.detail;
        const layerUrl = window.SETTINGS.urls.layer.replace(/modelname/g, modelname);

        map.getMap().on('load', function() {
            // Charger dynamiquement les objets depuis le backend en utilisant la méthode load
            objectsLayer.load(layerUrl);

            // ajout du contrôle de fichiers
            const fileLayerLoadControl = new MaplibreFileLayerControl({
                layerOptions: {
                    style: window.SETTINGS.map.styles.filelayer,
                }
            });

            map.getMap().addControl(fileLayerLoadControl, 'top-left');

            // Ajouter un contrôle pour réinitialiser la vue
            map.getMap().addControl(new MaplibreResetViewControl(bounds), 'top-left');

            // Gestion de History
            const history = window.MapEntity.currentHistory;

            // Gestion des Filtres
             const togglableFiltre = new MaplibreMapentityTogglableFiltre();
            // Initialisation de la synchronisation de la carte avec la table
            const mainDatatable = window.MapEntity.dt;
            const mapsync = new MaplibreMapListSync(mainDatatable, map.getMap(),
                objectsLayer, togglableFiltre, history);

            // Charge le formulaire de filtre au premier clic sur le bouton
            togglableFiltre.button.addEventListener('click', function (e) {
                // console.log('Chargement du formulaire de filtre');
                togglableFiltre.load_filter_form(mapsync);
            });

            const mapViewContext = getURLParameter('context');
            const mapentityContext = window.MapEntity.currentMap.mapentityContext;

                     // Bouton de capture d'écran pour la carte
            // En course de développement

            const screenshotControl = new MaplibreScreenshotController(window.SETTINGS.urls.screenshot,
                () => {
                context = mapentityContext.getFullContext(map.getMap(), {
                    filter: 'mainfilter', // id du formulaire de filtre
                    datatable: mainDatatable,
                    objectsname: modelname, // layers
                    prefix: 'list',
                });
                context['selector'] = '#mainmap';
                return JSON.stringify(context);
            });
            map.getMap().addControl(screenshotControl, 'top-left');


            // if (mapViewContext) {
            //     mapentityContext.restoreFullContext(
            //         map.getMap(),
            //         mapViewContext, {
            //         filter: 'mainfilter', // id du formulaire de filtre
            //         datatable: mainDatatable,
            //         objectsname: modelname,// layers
            //         prefix: 'list',
            //     });
            // }

            // Sauvegarde le contexte de la carte lors de la fermeture de la fenêtre
            window.addEventListener('visibilitychange', function() {
                mapentityContext.saveFullContext(map.getMap(), {
                    filter: 'mainfilter', // id du formulaire de filtre
                    datatable: mainDatatable,
                    prefix: 'list',
                });
            });

        });
    });

});
