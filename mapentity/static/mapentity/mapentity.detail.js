// Écoute l'événement 'detailmap:ready' pour initialiser la carte et ses couches
$(window).on('detailmap:ready', function (e, data) {
    // Récupère certaines propriétés de l'objet courant
    var body = $('body');
    var verbosename = body.attr('data-app-verbosename'); // Nom détaillé de l'application
    var objectsname = body.attr('data-objectsname'); // Nom des objets
    var modelname = body.attr('data-modelname'); // Nom du modèle

    // Prépare les informations pour la couche de la carte
    var layername = `${modelname}_layer`; // Nom de la couche
    var url = window.SETTINGS.urls[layername]; // URL de la couche
    var loaded_layer = false; // Indique si la couche est chargée
    var map = data.map; // Référence à la carte
    var style = window.SETTINGS.map.styles[modelname] || window.SETTINGS.map.styles.others; // Style de la couche

    // Vérifie si le style est une fonction, sinon l'étend
    if (typeof window.SETTINGS.map.styles.others !== 'function') {
        style = L.Util.extend({}, style);
    }

    // Crée une nouvelle couche d'objets avec un filtre pour exclure l'objet courant
    var layer = new L.ObjectsLayer(null, {
        modelname: modelname,
        style: style,
        filter: function filterWithoutCurentPk(el) {
            return el.properties.id !== parseInt(body.attr('data-pk'), 10); // Exclut l'objet courant
        },
    });

    // Ajoute la couche à la carte avec un contrôle de superposition
    map.layerscontrol.addOverlay(layer, objectsname, verbosename);

    // Ajoute la couche d'objets familiaux (sans l'objet courant) lorsque la couche est ajoutée à la carte
    map.on('layeradd', function (e) {
        var options = e.layer.options || { 'modelname': 'None' };
        if (!loaded_layer && options.modelname === modelname && options.modelname !== data.modelname) {
            layer.load(url); // Charge la couche
            map.addLayer(layer); // Ajoute la couche à la carte
            loaded_layer = true; // Marque la couche comme chargée
        }
    });

    // Supprime la couche d'objets familiaux lorsque la couche est retirée de la carte
    map.on('layerremove', function (e) {
        var options = e.layer.options || { 'modelname': 'None' };
        if (loaded_layer && options.modelname === modelname && options.modelname !== data.modelname) {
            map.removeLayer(layer); // Retire la couche de la carte
            loaded_layer = false; // Marque la couche comme non chargée
        }
    });
});