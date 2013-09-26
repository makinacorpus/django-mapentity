MapEntity.GeometryField = L.GeometryField.extend({

    addTo: function (map) {
        L.GeometryField.prototype.addTo.call(this, map);

        // Add layer of objects of same type
        /*
        'addObectsLayer': {
            'getUrl': function(modelname) {
                return '{% url 'core:path_layer' %}'.replace(new RegExp('path', 'g'), modelname);
            }
        },
         */

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
    },

});
