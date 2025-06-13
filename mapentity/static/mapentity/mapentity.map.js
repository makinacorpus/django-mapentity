// Définition d'une nouvelle classe de contrôle Leaflet pour la capture d'écran
L.Control.Screenshot = L.Control.extend({
    includes: L.Mixin.Events, // Inclut les événements de mixin Leaflet
    options: {
        position: 'topleft', // Position du contrôle sur la carte
    },
    statics: {
        TITLE:  'Screenshot' // Titre du contrôle
    },

    // Initialisation du contrôle avec une URL et une fonction de contexte
    initialize: function (url, getcontext) {
        this.url = url; // URL pour envoyer les données de capture
        this.getcontext = getcontext; // Fonction pour obtenir le contexte de capture
    },

    // Fonction pour effectuer une capture d'écran
    screenshot: function () {
        // Effet visuel de capture d'écran
        $('<div id="overlay" style="z-index: 5000; position:fixed; top:0; left:0; width:100%; height:100%; background-color: white;"> </div>')
            .appendTo(document.body) // Ajoute un overlay blanc au document
            .fadeOut(); // Fait disparaître l'overlay

        var fullContext = this.getcontext(); // Récupère le contexte complet
        // Hack pour télécharger une réponse en pièce jointe via Ajax
        $('<form action="' + this.url + '" method="post">' +
        '<textarea name="printcontext">' + fullContext + '</textarea>' +
        '</form>').appendTo('body').submit().remove(); // Soumet et supprime le formulaire
        this.fire('triggered'); // Déclenche un événement personnalisé
    },

    // Ajout du contrôle à la carte
    onAdd: function(map) {
        this.map = map; // Référence à la carte
        this._container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-control leaflet-bar'); // Conteneur du contrôle
        var link = L.DomUtil.create('a', 'leaflet-control-zoom-out screenshot-control', this._container); // Lien pour le contrôle
        link.href = '#'; // Lien vide
        link.title = L.Control.Screenshot.TITLE; // Titre du lien

        // Ajout des événements au lien
        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation) // Empêche la propagation de l'événement
            .addListener(link, 'click', L.DomEvent.preventDefault) // Empêche le comportement par défaut
            .addListener(link, 'click', this.screenshot, this); // Appelle la fonction de capture
        return this._container; // Retourne le conteneur du contrôle
    }
});

/**
 * Affiche une étiquette statique au milieu de la polyline.
 * Elle sera masquée pour les niveaux de zoom inférieurs à ``LABEL_MIN_ZOOM``.
 */
MapEntity.showLineLabel = function (layer, options) {
    var LABEL_MIN_ZOOM = 6; // Niveau de zoom minimum pour afficher l'étiquette

    // Convertit la couleur en format RGB
    var rgb = parseColor(options.color);

    // Lie une étiquette au calque avec les options spécifiées
    layer.bindLabel(options.text, {noHide: true, className: options.className});

    // Sauvegarde la méthode originale `onAdd` du calque
    var __layerOnAdd = layer.onAdd;
    layer.onAdd = function (map) {
        __layerOnAdd.call(layer, map); // Appelle la méthode originale
        if (map.getZoom() >= LABEL_MIN_ZOOM) {
            layer._showLabel(); // Affiche l'étiquette si le zoom est suffisant
        }
        map.on('zoomend', hideOnZoomOut); // Ajoute un gestionnaire d'événement pour le zoom
    };

    // Sauvegarde la méthode originale `onRemove` du calque
    var __layerOnRemove = layer.onRemove;
    layer.onRemove = function () {
        layer._map.off('zoomend', hideOnZoomOut); // Supprime le gestionnaire d'événement
        if (layer._hideLabel) layer._hideLabel(); // Masque l'étiquette si elle est visible
        __layerOnRemove.call(layer); // Appelle la méthode originale
    };

    // Sauvegarde la méthode originale `_showLabel` du calque
    var __layerShowLabel = layer._showLabel;
    layer._showLabel = function () {
        __layerShowLabel.call(layer, {latlng: midLatLng(layer)}); // Affiche l'étiquette au milieu de la polyline
        layer.label._container.title = options.title; // Définit le titre de l'étiquette
        layer.label._container.style.backgroundColor = 'rgba('+rgb.join(',')+ ',0.8)'; // Définit la couleur de fond
        layer.label._container.style.borderColor = 'rgba('+rgb.join(',')+ ',0.6)'; // Définit la couleur de la bordure
    };

    // Fonction pour masquer l'étiquette si le zoom est insuffisant
    function hideOnZoomOut() {
        if (layer._map.getZoom() < LABEL_MIN_ZOOM)
            if (layer._hideLabel) layer._hideLabel(); // Masque l'étiquette
        else
            if (layer._showLabel) layer._showLabel(); // Affiche l'étiquette
    }

    // Fonction pour calculer le point médian de la polyline
    function midLatLng(line) {
        var mid = Math.floor(line.getLatLngs().length/2); // Calcule l'indice du point médian
        return L.latLng(line.getLatLngs()[mid]); // Retourne les coordonnées du point médian
    }
};


// Écouteur d'événement pour l'initialisation de la carte
$(window).on('entity:map', function (e, data) {
    var map = data.map,
        $container = $(map._container),
        readonly = $container.data('readonly');

    // Remplace le sélecteur de calques par défaut par Leaflet.GroupedLayerSwitcher
    if (map.layerscontrol) {
        map.layerscontrol.removeFrom(map);
    }
    var baseLayers = {};
    var overlaysLayers = {};
    for (var l in map.layerscontrol._layers) {
        var layer = map.layerscontrol._layers[l];
        if (layer.overlay)
            overlaysLayers[layer.name] = layer.layer; // Ajoute les calques superposés
        else
            baseLayers[layer.name] = layer.layer; // Ajoute les calques de base
    }
    var layerscontrol = L.control.groupedLayers(baseLayers, {'': overlaysLayers});
    map.layerscontrol = layerscontrol.addTo(map);

    // Désactive le défilement sur le formulaire de superposition pour éviter les zooms accidentels
    L.DomEvent.disableScrollPropagation(layerscontrol._container);

    if (readonly) {
        // Rend la carte en mode lecture seule
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
    }

    var mapBounds = $container.data('mapextent');
    if (mapBounds) {
        map.fitBounds(mapBounds); // Ajuste la carte aux limites spécifiées
        var maxZoom = $container.data('fitmaxzoom');
        if (map.getZoom() > maxZoom) {
            console.log('Limited zoom to ', maxZoom, '. Was ', map.getZoom());
            map.setZoom(maxZoom); // Limite le zoom maximum
        }
        map.resetviewControl.getBounds = function () { return mapBounds; };
    }

    // Ajoute des contrôles supplémentaires à la carte
    map.addControl(new L.Control.FullScreen());
    map.addControl(new L.Control.MeasureControl());

    // Événement déclenché à la fin d'un déplacement de la carte
    map.on("moveend", function () {
        var bounds = map.getBounds();
        var rect = new L.Rectangle([bounds._northEast, bounds._southWest]);
        $('#id_bbox').val(L.Util.getWKT(rect)); // Met à jour le champ de la boîte englobante
    });

});


// Événement déclenché pour la carte en mode "détail"
$(window).on('entity:map:detail', function (e, data) {
    var map = data.map,
        $container = $(map._container);

    // Ajout d'un bouton pour la capture d'écran
    var screenshot = new L.Control.Screenshot(window.SETTINGS.urls.screenshot, function () {
        context = MapEntity.Context.getFullContext(map);
        context['selector'] = '#detailmap'; // Sélecteur pour la carte de détail
        return JSON.stringify(context);
    });
    map.addControl(screenshot);

    // Restauration du contexte de la carte, uniquement pour les captures d'écran
    var context = getURLParameter('context');
    if (context && typeof context == 'object') {
        MapEntity.Context.restoreFullContext(map, context);
    }

    // Sauvegarde du contexte de la carte : sera restauré dans le prochain formulaire
    $(window).unload(function () {
        MapEntity.Context.saveFullContext(map, {prefix: 'detail'});
    });

    // Affichage de la géométrie de l'objet sur la carte de détail
    var feature_geojson_url = $("#detailmap").attr('data-feature-url');
    $.get(feature_geojson_url, function (data) {
        var objectLayer = _showSingleObject(data);

        // Déclenche un événement lorsque la carte de détail est prête
        $(window).trigger('detailmap:ready', {map: map,
                                              layer: objectLayer,
                                              context: context,
                                              modelname: data.modelname});
    });

    // Fonction pour afficher un objet unique sur la carte
    function _showSingleObject(geojson) {
        console.log(data); // Affiche les données dans la console
        var DETAIL_STYLE = L.Util.extend(window.SETTINGS.map.styles.detail, {clickable: false});

        // Apparence de la géométrie pour l'export, contrôlée via les paramètres
        if (context && context.print) {
            var specified = window.SETTINGS.map.styles.print[data.modelname];
            if (specified) {
                DETAIL_STYLE = L.Util.extend(DETAIL_STYLE, specified);
            }
        }

        // Ajout des couches
        var objectLayer = new L.ObjectsLayer(geojson, {
            style: DETAIL_STYLE,
            indexing: false,
            modelname: data.modelname
        });
        map.addLayer(objectLayer);
        map.on('layeradd', function (e) {
            if (!e.layer.properties && objectLayer._map) {
                objectLayer.bringToFront(); // Met la couche au premier plan
            }
        });

        // Affichage de l'énumération des objets
        var sublayers = objectLayer.getLayers();
        if (sublayers.length === 1) {
            // Une seule couche, mais multi-* ou collection de géométries
            if (typeof sublayers[0].getLayers === 'function') {
                sublayers[0].showEnumeration();
            }
        }
        else {
            objectLayer.showEnumeration();
        }

        return objectLayer;
    }
});


// Événement déclenché pour la carte en mode "liste"
$(window).on('entity:map:list', function (e, data) {
    var map = data.map,
        bounds = L.latLngBounds(data.options.extent);

    // Désactive le zoom par double-clic
    map.doubleClickZoom.disable();

    // Ajoute un contrôle pour réinitialiser la vue de la carte
    map.addControl(new L.Control.ResetView(bounds));

    /*
     * Calque des objets
     * .......................
     */
    function getUrl(properties, layer) {
        // Génère l'URL pour les détails d'un objet
        return window.SETTINGS.urls.detail.replace(new RegExp('modelname', 'g'), data.modelname)
                                          .replace('0', properties.id);
    }

    // Récupère le style pour le modèle ou utilise un style par défaut
    var style = window.SETTINGS.map.styles[data.modelname];
    if (style === undefined) {
        style = window.SETTINGS.map.styles.others;
    }
    if (!(typeof window.SETTINGS.map.styles.others === "function")) {
        var style = L.Util.extend({}, style);
    }

    // Crée un calque pour les objets
    var objectsLayer = new L.ObjectsLayer(null, {
        objectUrl: getUrl,
        style: style,
        modelname: data.modelname,
        onEachFeature: function (geojson, layer) {
            // Ajoute une étiquette si l'objet a un nom
            if (geojson.properties.name) layer.bindLabel(geojson.properties.name);
        }
    });

    // Met en avant les objets sélectionnés ou survolés
    objectsLayer.on('highlight select', function (e) {
        if (data.modelname != 'site' && e.layer._map !== null) e.layer.bringToFront();
    });

    // Ajoute le calque des objets à la carte
    map.addLayer(objectsLayer);
    // console.log('Ajout de la couche d\'objets', window.SETTINGS.urls.layer.replace(new RegExp('modelname', 'g'), data.modelname));
    objectsLayer.load(window.SETTINGS.urls.layer.replace(new RegExp('modelname', 'g'), data.modelname)); // chargement des données via url

    // Ajoute une légende pour le calque des objets
    var nameHTML = '<span style="color: '+ style['color'] + ';">&#x25A3;</span>&nbsp;' + data.objectsname;
    map.layerscontrol.addOverlay(objectsLayer, nameHTML, tr("Objects")); // categorie "Objects" ajoutées manuellement

    // Initialise la table de données principale
    var dt = MapEntity.mainDatatable;
    window.objectsLayer = objectsLayer;

    /*
     * Assemble les composants
     * .......................
     */
    var mapsync = new L.MapListSync(dt,
                                    map,
                                    objectsLayer, {
                                        filter: {
                                            form: $('#mainfilter'),
                                            submitbutton: $('#filter'),
                                            resetbutton: $('#reset'),
                                            bboxfield: $('#id_bbox'),
                                        }
                                    });

    // Gestion des événements de rechargement
    mapsync.on('reloaded', function (data) {
        // Affiche et sauvegarde le nombre de résultats
        MapEntity.history.saveListInfo({model: data.modelname,
                                        nb: data.nbrecords});
        // Affiche les informations sur le calque
        objectsLayer.fire('info', {info : (data.nbrecords + ' ' + tr("results"))});
    });

    // Filtre principal
    var t = new MapEntity.TogglableFilter();
    mapsync.on('reloaded', function (data) {
        t.setsubmit();
    });

    // Charge le formulaire de filtre au premier clic sur le bouton
    t.$button.click(function (e) {
         t.load_filter_form(mapsync);
    });

    // Bouton de capture d'écran pour la carte
    var screenshot = new L.Control.Screenshot(window.SETTINGS.urls.screenshot, function () {
        context = MapEntity.Context.getFullContext(map, {
            filter: '#mainfilter',
            datatable: dt
        });
        context['selector'] = '#mainmap';
        return JSON.stringify(context);
    });
    map.addControl(screenshot);

    /*
     * Permet de charger des fichiers localement
     */
    var pointToLayer = function (feature, latlng) {
            return L.circleMarker(latlng, {style: window.SETTINGS.map.styles.filelayer})
                    .setRadius(window.SETTINGS.map.styles.filelayer.radius);
        },
        onEachFeature = function (feature, layer) {
            // Ajoute une étiquette si l'objet a un nom
            if (feature.properties.name) {
                layer.bindLabel(feature.properties.name);
            }
        },

        // filecontrol est un contrôle de chargement de fichiers,
        // elle est pour le moins qu'un calque posé au dessus de la carte
        filecontrol = L.Control.fileLayerLoad({
            fitBounds: true,
            layerOptions: {style: window.SETTINGS.map.styles.filelayer,
                           pointToLayer: pointToLayer,
                           onEachFeature: onEachFeature}
        });

    // Ajoute le contrôle de chargement de fichiers à la carte
    map.filecontrol = filecontrol;
    map.addControl(filecontrol);

    // Restaure la vue de la carte, les calques et les filtres à partir d'un contexte disponible
    var mapViewContext = getURLParameter('context'),
        layerLabel = $('<div></div>').append(nameHTML).text();
    MapEntity.Context.restoreFullContext(map,
        // Contexte depuis le paramètre URL
        mapViewContext,
        // Paramètres
        {
            filter: '#mainfilter',
            datatable: dt,
            objectsname: layerLabel,
            // Utilisation de préfixes pour gérer plusieurs contextes (ex. "detail" et "list")
            prefix: 'list',
        }
    );

    // Sauvegarde le contexte de la carte lors de la fermeture de la fenêtre
    $(window).unload(function () {
        MapEntity.Context.saveFullContext(map, {
            filter: '#mainfilter',
            datatable: dt,
            prefix: 'list',
        });
    });
});
