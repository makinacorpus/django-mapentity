if (!window.MapEntity) window.MapEntity = {};

MapEntity.GeometryField = L.GeometryField.extend({

    initialize: function () {
        L.GeometryField.prototype.initialize.apply(this, arguments);
        this._initialBounds = null;
        this._resetBounds = null;
    },

    _controlDrawOptions: function () {
        // Set drawn shapes style
        var options = L.GeometryField.prototype._controlDrawOptions.call(this);
        if (options.polyline) {
            options.polyline = {shapeOptions: window.SETTINGS.map.styles.draw};
        }
        return options;
    },

    _editionLayer: function () {
        // Set instance layer style
        var layer = L.GeometryField.prototype._editionLayer.call(this);
        var style = L.Util.extend(window.SETTINGS.map.styles.draw, {clickable: true});
        layer.setStyle(style);
        return layer;
    },

    addTo: function (map) {
        L.GeometryField.prototype.addTo.call(this, map);

        this._addExtraControls();
        this._addExtraLayers();
    },

    _addExtraControls: function () {
        map.removeControl(map.attributionControl);
        map.addControl(new L.Control.ResetView(this._getResetBounds.bind(this)));
        map.addControl(new L.Control.MeasureControl());

        /*
         * Allow to load files locally.
         */
        var pointToLayer = function (feature, latlng) {
                return L.circle(latlng,
                                window.SETTINGS.map.styles.filelayer.radius,
                                {style: window.SETTINGS.map.styles.filelayer});
            },
            onEachFeature = function (feature, layer) {
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
        map.filecontrol = filecontrol;
        map.addControl(filecontrol);
    },

    _addExtraLayers: function () {
        // Layer with objects of same type
        var objectsLayer = this.buildObjectsLayer();
        map.addLayer(objectsLayer);

        var modelname = this.getModelName(),
            url = window.SETTINGS.urls.layer.replace(new RegExp('modelname', 'g'), modelname);
        objectsLayer.load(url);
    },

    buildObjectsLayer: function () {
        var object_pk = this.getInstancePk();
        var exclude_current_object = null;
        if (object_pk) {
            exclude_current_object = function (geojson) {
                if (geojson.properties && geojson.properties.pk)
                    return geojson.properties.pk != object_pk;
            };
        }

        // Start loading all objects, readonly
        var style = window.SETTINGS.map.styles.others;
        style = L.Util.extend(style, {weight: 4, clickable: true});
        var objectsLayer = new L.ObjectsLayer(null, {
            style: style,
            filter: exclude_current_object,
            onEachFeature: function (geojson, layer) {
                if (geojson.properties.name) layer.bindLabel(geojson.properties.name);
            }
        });
        objectsLayer.on('loaded', function() {
            // Make sure it stays below other layers
            objectsLayer.bringToBack();
        });
        return objectsLayer;
    },

    _setView: function () {
        var setView = true;
        var geometry = this.store.load();
        if (!geometry) {
            if (MapEntity.Context.restoreLatestMapView(map, ['detail', 'list'])) {
                setView = false;
            }
        }
        if (setView) {
            L.GeometryField.prototype._setView.call(this);
        }

        this._initialBounds = map.getBounds();
        this._resetBounds = this._initialBounds;
    },

    _getResetBounds: function () {
        return this._resetBounds;
    },

    onCreated: function (e) {
        L.GeometryField.prototype.onCreated.call(this, e);
        if (!this.options.is_point || this.drawnItems.getLayers().length > 0) {
            this._resetBounds = this.drawnItems.getBounds();
        }
    },

    onDeleted: function (e) {
        L.GeometryField.prototype.onDeleted.call(this, e);
        this._resetBounds = this._initialBounds;
    },

    getModelName: function () {
        var m = $('form input[name="model"]').val() || null;
        if (!m)
            throw "No model name in form";
        return m;
    },

    getInstancePk: function (e) {
        // TODO: $('form') => fails if there are more than one form
        // On creation, this should be null
        return $('form input[name="pk"]').val() || null;
    },

});
