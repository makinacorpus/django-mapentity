MapEntity.Context = new function() {
    var self = this;

    self.getFullContext = function(map, kwargs) {
        var context = {},
            filter = kwargs && kwargs.filter,
            datatable = kwargs && kwargs.datatable;

        // Map view
        context['mapview'] = {'lat': map.getCenter().lat, 'lng': map.getCenter().lng, 'zoom': map.getZoom()};

        // layers shown by name
        var layers = [];
        $('form.leaflet-control-layers-list input:checked').each(function () {
            layers.push($.trim($(this).parent().text()));
        });
        context['maplayers'] = layers;

        // Form filters
        if (filter) {
            // exclude bbox field, since it comes from the map view.
            var fields = $($(filter).serializeArray()).filter(function (){ return this.name != 'bbox';});
            context['filter'] = $.param(fields);
        }

        // Sort columns
        if (datatable) {
            context['sortcolumns'] = datatable.fnSettings().aaSorting;
        }

        // Extra-info, not restored so far but can be useful for screenshoting
        context['fullurl'] = window.location.toString();
        context['url'] = window.location.pathname.toString();
        context['viewport'] = {'width': $(window).width(), 'height': $(window).height()};
        context['mapsize'] = {'width': $('.map-panel').width(), 'height': $('.map-panel').height()};

        // Mark timestamp
        context['timestamp'] = new Date().getTime();

        return context;
    },

    self.saveFullContext = function(map, kwargs) {
        var prefix = kwargs.prefix || '',
            serialized = JSON.stringify(self.getFullContext(map, kwargs));
        localStorage.setItem(prefix + 'map-context', serialized);
    };

    self.__loadFullContext = function(kwargs) {
        if (!kwargs) kwargs = {};
        var prefix = kwargs.prefix || '',
            context = localStorage.getItem(prefix + 'map-context');
        if (context)
            return JSON.parse(context);
        return null;
    };

    self.restoreLatestMapView = function (map, prefixes, kwargs) {
        var latest = null;
        for (var i=0; i<prefixes.length; i++) {
            var prefix = prefixes[i],
                context = self.__loadFullContext($.extend(kwargs, {prefix: prefix}));
            if (!latest || (context && context.timestamp && context.timestamp > latest.timestamp)) {
                latest = context;
                console.debug(JSON.stringify(context));
            }
        }
        return self.restoreMapView(map, latest, kwargs);
    };

    self.restoreMapView = function(map, context, kwargs) {
        if (!context) context = self.__loadFullContext(kwargs);
        if (context && context.mapview) {
            map.setView(L.latLng(context.mapview.lat, context.mapview.lng), context.mapview.zoom);
            return true;
        }
        return false;
    };

    self.restoreFullContext = function(map, context, kwargs) {
        if (!kwargs) kwargs = {};
        var filter = kwargs.filter,
            datatable = kwargs.datatable,
            objectsname = kwargs.objectsname;

        if (!context || typeof context != 'object') {
            // If not received from URL, load from LocalStorage
            context = self.__loadFullContext(kwargs);
        }
        if (!context) {
            console.warn("No context found.");
            map.fitBounds(map.options.maxBounds);
            return;  // No context, no restore.
        }

        if (context.mapsize) {
            // Override min-height style
            map._container.style.minHeight = '0';
            // Force map size
            if (context.mapsize.width && context.mapsize.width > 0)
                $('.map-panel').width(context.mapsize.width);
            if (context.mapsize.height && context.mapsize.height > 0)
                $('.map-panel').height(context.mapsize.height);
            map.invalidateSize();
        }

        self.restoreMapView(map, context, kwargs);

        if (filter && context.filter) {
            $(filter).deserialize(context.filter);
            $(filter).find('select').trigger("liszt:updated");
        }
        if (datatable && context.sortcolumns) {
            datatable.fnSort(context.sortcolumns);
        }

        // Show layers by their name
        if (context.maplayers) {
            var layers = context.maplayers;
            layers.push(objectsname);
            $('form.leaflet-control-layers-list input').each(function () {
                if ($.trim($(this).parent().text()) != objectsname) {
                    $(this).removeAttr('checked');
                }
            });
            for(var i=0; i<layers.length; i++) {
                var layer = layers[i];
                $('form.leaflet-control-layers-list input').each(function () {
                    if ($.trim($(this).parent().text()) == layer) {
                        $(this).attr('checked', 'checked');
                    }
                });
            }
            if (map.layerscontrol !== undefined) {
                map.layerscontrol._onInputClick();
            }
        }

        if (context.print) {
            // Disable tiles animations when screenshoting
            $(map._container).removeClass('leaflet-fade-anim');
        }
    };
};
