if (!window.MapEntity) window.MapEntity = {};

// Disable button if submit event on form
Array.from(document.getElementsByClassName("mapentity-form")).forEach(function (formElement) {
    formElement.addEventListener('submit', function () {
        formElement.querySelector("button[type=submit]").setAttribute("disabled", true);
    }, false);
});

/*
rédéfini la classe GeometryField de leaflet.forms.js de djangoleaflet notamment les méthodes
- initialize
- _controlDrawOptions
- load
- addTo
- _setview
- onDeleted
ajoute le reste des méthodes
 */
MapEntity.GeometryField = L.GeometryField.extend({

    initialize: function () {
        // Appelle la méthode d'initialisation de la classe parente
        L.GeometryField.prototype.initialize.apply(this, arguments);
        // Initialise les limites initiales et de réinitialisation
        this._initialBounds = null;
        this._resetBounds = null;
    },

    _controlDrawOptions: function () {
        // Définit le style des formes dessinées
        var options = L.GeometryField.prototype._controlDrawOptions.call(this);
        if (options.draw.polyline === true) {
            // Applique un style spécifique aux polylignes
            options.draw.polyline = {shapeOptions: window.SETTINGS.map.styles.draw};
        }
        options.edit = options.edit || {};
        options.edit.edit = options.edit.edit || {};
        // Ajoute des options de style pour les chemins sélectionnés
        options.edit.edit.selectedPathOptions = L.Util.extend({dashArray: '10 10'},
                                                              window.SETTINGS.map.styles.draw);
        return options;
    },

    load: function () {
        // Charge la géométrie en appelant la méthode parente
        var geometry = L.GeometryField.prototype.load.apply(this, arguments);
        // Applique un style si la géométrie est définie et possède une méthode setStyle
        if (geometry && typeof(geometry.setStyle) == 'function') {
            var style = L.Util.extend({clickable: true}, window.SETTINGS.map.styles.draw);
            geometry.setStyle(style);
        }
        return geometry;
    },

    addTo: function (map) {
        // Ajoute des contrôles supplémentaires à la carte
        this._addExtraControls(map);
        // Appelle la méthode parente pour ajouter l'objet à la carte
        L.GeometryField.prototype.addTo.call(this, map);
        // Ajoute des couches supplémentaires à la carte
        this._addExtraLayers(map);
    },

    _addExtraControls: function (map) {
        /*
        * Permet de charger des fichiers localement.
        */
        var pointToLayer = function (feature, latlng) {
                // Définit un style pour les points
                return L.circleMarker(latlng, {style: window.SETTINGS.map.styles.filelayer})
                        .setRadius(window.SETTINGS.map.styles.filelayer.radius);
            },
            onEachFeature = function (feature, layer) {
                // Ajoute un label si une propriété "name" est présente
                if (feature.properties.name) {
                    layer.bindLabel(feature.properties.name);
                }
            },
            filecontrol = L.Control.fileLayerLoad({
                fitBounds: true,
                layerOptions: {style: window.SETTINGS.map.styles.filelayer,
                            pointToLayer: pointToLayer,
                            onEachFeature: onEachFeature}
            });
        // Ajoute le contrôle de fichier à la carte
        map.filecontrol = filecontrol;
        map.addControl(filecontrol);
    },

    _addExtraLayers: function (map) {
        // Ajoute une couche contenant des objets du même type
        var objectsLayer = this.buildObjectsLayer();

        // TODO se souvenir de l'état
        // voir https://github.com/makinacorpus/Geotrek/issues/1108
        map.addLayer(objectsLayer);

        // Ajoute un style et un nom à la couche
        var style = objectsLayer.options.style;
        var objectsname = $('body').data('objectsname');
        var nameHTML = '<span style="color: '+ style['color'] + ';">&#x25A3;</span>&nbsp;' + objectsname;
        map.layerscontrol.addOverlay(objectsLayer, nameHTML, tr("Objects"));

        // Charge les données pour la couche
        var url = this.modelLayerUrl();
        objectsLayer.load(url);
    },

    modelLayerUrl: function (modelname) {
        // Génère l'URL pour charger une couche de modèle
        modelname = modelname || this.getModelName();
        return window.SETTINGS.urls.layer
                     .replace(new RegExp('modelname', 'g'), modelname);
    },

    buildObjectsLayer: function () {
        // Récupère la clé primaire de l'objet actuel
        var object_pk = this.getInstancePk();
        var exclude_current_object = null;

        // Si une clé primaire est définie, exclut l'objet actuel des résultats
        if (object_pk) {
            exclude_current_object = function (geojson) {
                if (geojson.properties && geojson.properties.id)
                    return geojson.properties.id !== object_pk;
            };
        }

        // Initialise une couche pour charger tous les objets en lecture seule
        var style = L.Util.extend({weight: 4, clickable: true},
                                  window.SETTINGS.map.styles.others);
        var objectsLayer = new L.ObjectsLayer(null, {
            style: style,
            modelname: this.getModelName(),
            filter: exclude_current_object,
            onEachFeature: function (geojson, layer) {
                // Ajoute un label si une propriété "name" est présente
                if (geojson.properties.name) layer.bindLabel(geojson.properties.name);
            }
        });

        // S'assure que la couche reste en arrière-plan après le chargement
        objectsLayer.on('loaded', function() {
            objectsLayer.bringToBack();
        });

        return objectsLayer;
    },

    _setView: function () {
        var setView = true;

        // Charge la géométrie depuis le stockage
        var geometry = this.store.load();

        // Si aucune géométrie n'est définie ou si elle ne possède pas de méthode getBounds
        if (!geometry || typeof(geometry.getBounds) != 'function') {
            // Restaure la dernière vue de la carte si disponible
            if (MapEntity.Context.restoreLatestMapView(this._map, ['detail', 'list'])) {
                setView = false;
            }
        }

        // Définit la vue si nécessaire
        if (setView) {
            L.GeometryField.prototype._setView.call(this);
        }

        // Initialise les limites initiales et de réinitialisation
        this._initialBounds = this._map.getBounds();
        this._resetBounds = this._initialBounds;
    },

    _getResetBounds: function () {
        // Retourne les limites de réinitialisation
        return this._resetBounds;
    },

    onCreated: function (e) {
        // Appelle la méthode parente lors de la création
        L.GeometryField.prototype.onCreated.call(this, e);

        // Met à jour les limites de réinitialisation si nécessaire
        if (!this.options.is_point || this.drawnItems.getLayers().length > 0) {
            this._resetBounds = this.drawnItems.getBounds();
        }
    },

    onDeleted: function (e) {
        // Appelle la méthode parente lors de la suppression
        L.GeometryField.prototype.onDeleted.call(this, e);

        // Réinitialise les limites à leur état initial
        this._resetBounds = this._initialBounds;
    },

    getModelName: function () {
        // Récupère le nom du modèle depuis les données du corps de la page
        return $('body').data('modelname');
    },

    getInstancePk: function (e) {
        // Récupère la clé primaire de l'instance ou null si elle n'existe pas
        return $('body').data('pk') || null;
    },

});
