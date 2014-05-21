L.Control.Screenshot = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topleft',
    },
    statics: {
        TITLE:  'Screenshot'
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
        link.title = L.Control.Screenshot.TITLE;

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
        layer.label._container.title = options.title;
        layer.label._container.style.backgroundColor = 'rgba('+rgb.join(',')+ ',0.8)';
        layer.label._container.style.borderColor = 'rgba('+rgb.join(',')+ ',0.6)';
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


$(window).on('entity:map', function (e, data) {
    var map = data.map,
        $container = $(map._container),
        readonly = $container.data('readonly');

    if (readonly) {
        // Set map readonly
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
    }

    map.attributionControl.setPrefix('');

    var mapBounds = $container.data('mapextent');
    if (mapBounds) {
        map.fitBounds(mapBounds);
        map.resetviewControl.getBounds = function () { return mapBounds; };
    }

    var $singleObject = $container.find('.geojsonfeature');
    if ($singleObject.length > 0) {
        showSingleObject(JSON.parse($singleObject.text()));
    }

    map.addControl(new L.Control.FullScreen());
    map.addControl(new L.Control.MeasureControl());


    function showSingleObject(geojson) {
        var DETAIL_STYLE = L.Util.extend(window.SETTINGS.map.styles.detail, {clickable: false});

        // Add layers
        var objectLayer = new L.ObjectsLayer(geojson, {
            style: DETAIL_STYLE,
            indexing: false
        });
        map.addLayer(objectLayer);
        map.on('layeradd', function (e) {
            if (objectLayer._map) objectLayer.bringToFront();
        });

        // Show start and end
        objectLayer.eachLayer(function (layer) {
            if (layer instanceof L.MultiPolyline)
                return;
            if (typeof layer.getLatLngs != 'function')  // points
                return;

            L.marker(layer.getLatLngs()[0],
                     {clickable: false,
                      icon: new L.Icon.Default({iconUrl: window.SETTINGS.urls.static + "mapentity/images/marker-source.png"})
                     }).addTo(map);
            L.marker(layer.getLatLngs().slice(-1)[0],
                     {clickable: false,
                      icon: new L.Icon.Default({iconUrl: window.SETTINGS.urls.static + "mapentity/images/marker-target.png"})
                     }).addTo(map);

            // Also add line orientation
            layer.setText('>     ', {repeat:true,
                                     offset: DETAIL_STYLE.weight,
                                     attributes: {'fill': DETAIL_STYLE.arrowColor, 'font-size': DETAIL_STYLE.arrowSize}});
        });
    }
});


$(window).on('entity:map:detail', function (e, data) {
    var map = data.map;

    // Map screenshot button
    var screenshot = new L.Control.Screenshot(window.SETTINGS.urls.screenshot, function () {
        context = MapEntity.Context.getFullContext(map);
        context['selector'] = '#detailmap';
        return JSON.stringify(context);
    });
    map.addControl(screenshot);

    // Restore map context, only for screenshoting purpose
    var context = getURLParameter('context');
    if (context && typeof context == 'object') {
        MapEntity.Context.restoreFullContext(map, context);
    }

    // Save map context : will be restored on next form (e.g. interventions, ref story #182)
    $(window).unload(function () {
        MapEntity.Context.saveFullContext(map, {prefix: 'detail'});
    });

    $(window).trigger('detailmap:ready', {map:map});
});


$(window).on('entity:map:list', function (e, data) {
    var map = data.map,
        bounds = L.latLngBounds(data.options.extent);

    map.removeControl(map.attributionControl);
    map.doubleClickZoom.disable();

    map.addControl(new L.Control.Information());
    map.addControl(new L.Control.ResetView(bounds));

    /*
     * Objects Layer
     * .......................
     */
    function getUrl(properties, layer) {
        return window.SETTINGS.urls.detail.replace(new RegExp('modelname', 'g'), data.modelname)
                                          .replace('0', properties.pk);
    }

    var objectsLayer = new L.ObjectsLayer(null, {
        objectUrl: getUrl,
        style: window.SETTINGS.map.styles.others,
        onEachFeature: function (geojson, layer) {
            if (geojson.properties.name) layer.bindLabel(geojson.properties.name);
        }
    });
    objectsLayer.on('highlight select', function (e) {
        if (e.layer._map !== null) e.layer.bringToFront();
    });
    map.addLayer(objectsLayer);

    if (map.layerscontrol === undefined) {
        map.layerscontrol = L.control.layers().addTo(map);
    }
    map.layerscontrol.addOverlay(objectsLayer, data.objectsname);
    objectsLayer.load(window.SETTINGS.urls.layer.replace(new RegExp('modelname', 'g'), data.modelname), true);


    var dt = MapEntity.mainDatatable;

    /*
     * Assemble components
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
    mapsync.on('reloaded', function (data) {
        // Show and save number of results
        MapEntity.history.saveListInfo({model: data.modelname,
                                        nb: data.nbrecords});
        // Show layer info
        objectsLayer.fire('info', {info : (data.nbrecords + ' ' + tr("results"))});
    });

    // Main filter
    var t = new MapEntity.TogglableFilter();
    mapsync.on('reloaded', function (data) {
        t.setsubmit();
    });

    // Map screenshot button
    var screenshot = new L.Control.Screenshot(window.SETTINGS.urls.screenshot, function () {
        context = MapEntity.Context.getFullContext(map, {
            filter: '#mainfilter',
            datatable: dt
        });
        context['selector'] = '#mainmap';
        return JSON.stringify(context);
    });
    map.addControl(screenshot);

    // Restore map view, layers and filter from any available context
    // Get context from URL parameter, if any
    var mapViewContext = getURLParameter('context');
    MapEntity.Context.restoreFullContext(map,
        // From URL param
        mapViewContext,
        // Parameters
        {
            filter: '#mainfilter',
            datatable: dt,
            objectsname: data.objectsname,
            // We can have several contexts in the application (mainly 'detail' and 'list')
            // Using prefixes is a way to manage this.
            prefix: 'list',
        }
    );
    $(window).unload(function () {
        MapEntity.Context.saveFullContext(map, {
            filter: '#mainfilter',
            datatable: dt,
            prefix: 'list',
        });
    });
});
