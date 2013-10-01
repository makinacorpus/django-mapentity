L.Control.Screenshot = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topleft',
        title: 'Screenshot'
    },

    initialize: function (url, getcontext) {
        this.url = url;
        this.getcontext = getcontext;
    },

    screenshot: function () {
        // Screenshot effect
        $('<div id="overlay" style="z-index: 5000; position:fixed; top:0; left:0; width:100%; height:100%; background-color: white;"> </div>')
            .appendTo(document.body)
            .fadeOut();

        var fullContext = this.getcontext();
        // Hack to download response attachment in Ajax
        $('<form action="' + this.url + '" method="post">' +
        '<textarea name="printcontext">' + fullContext + '</textarea>' +
        '</form>').appendTo('body').submit().remove();
        this.fire('triggered');
    },

    onAdd: function(map) {
        this.map = map;
        this._container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-control leaflet-bar');
        var link = L.DomUtil.create('a', 'leaflet-control-zoom-out screenshot-control', this._container);
        link.href = '#';
        link.title = this.options.title;

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', this.screenshot, this);
        return this._container;
    }
});


/**
 * Shows a static label in the middle of the Polyline.
 * It will be hidden on zoom levels below ``LABEL_MIN_ZOOM``.
 */
MapEntity.showLineLabel = function (layer, options) {
    var LABEL_MIN_ZOOM = 6;

    var rgb = parseColor(options.color);

    layer.bindLabel(options.text, {noHide: true, className: options.className});

    var __layerOnAdd = layer.onAdd;
    layer.onAdd = function (map) {
        __layerOnAdd.call(layer, map);
        if (map.getZoom() >= LABEL_MIN_ZOOM) {
            layer._showLabel();
        }
        map.on('zoomend', hideOnZoomOut);
    };

    var __layerOnRemove = layer.onRemove;
    layer.onRemove = function () {
        layer._map.off('zoomend', hideOnZoomOut);
        if (layer._hideLabel) layer._hideLabel();
        __layerOnRemove.call(layer);
    };

    var __layerShowLabel = layer._showLabel;
    layer._showLabel = function () {
        __layerShowLabel.call(layer, {latlng: midLatLng(layer)});
        layer._label._container.title = options.title;
        layer._label._container.style.backgroundColor = 'rgba('+rgb.join(',')+ ',0.8)';
        layer._label._container.style.borderColor = 'rgba('+rgb.join(',')+ ',0.6)';
    };

    function hideOnZoomOut() {
        if (layer._map.getZoom() < LABEL_MIN_ZOOM)
            if (layer._hideLabel) layer._hideLabel();
        else
            if (layer._showLabel) layer._showLabel();
    }

    function midLatLng(line) {
        var mid = Math.floor(line.getLatLngs().length/2);
        return L.latLng(line.getLatLngs()[mid]);
    }
};
