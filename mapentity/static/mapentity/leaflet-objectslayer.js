// this class is used to display geojson objects on the map
// and manage their interactions with the user (click, hover, etc).
L.ObjectsLayer = L.GeoJSON.extend({
    // Default options for the ObjectsLayer
    options: {
        indexing: true,
        highlight: true,
        objectUrl: null,
        // default style
        styles: {
            'default': {'color': 'blue', 'weight': 2, 'opacity': 0.8},
            highlight: {'color': 'red', 'weight': 5, 'opacity': 1},
            select: {'color': 'red', 'weight': 7, 'opacity': 1}
        }
    },

    // Mixin to distribute events to the map (precisely to the layer a part from the tile layer)
    includes: L.Mixin.Events,


    /*
        Initialize the ObjectsLayer with GeoJSON data and options
        This function is called when the layer is created
        It sets up the layer, binds events, and prepares the layer for use
        It also handles the loading of GeoJSON data from a URL if provided
        The options parameter allows customization of the layer's behavior
        @param geojson: GeoJSON data
        @param options: Options to customize the layer's behavior
     */
    initialize: function (geojson, options) {
        // Pointers to all layers by pk - immutable
        this._objects = {};

        // Hold the currently visible layers (subset of _objects)
        this._current_objects = {};
        this.loading = false;

        options = L.Util.extend({}, options);

        // Index all layers from the initial geojson
        var onFeatureParse = function (geojson, layer) {
            this._mapObjects(geojson, layer);
            if (this._onEachFeature) {
                this._onEachFeature(geojson, layer);
            }
        };

        /*
        represente a point as a circle if radius is defined in properties
        @param geojson: GeoJSON data
        @param latlng: LatLng object representing the location of the point
         */
        var pointToLayer = function (geojson, latlng) {
            if (this._pointToLayer) return this._pointToLayer(geojson, latlng);
            if (geojson.geometry.type === "Point" && geojson.properties.radius) {
                return new L.Circle(latlng, geojson.properties.radius);
            }
            return new L.CircleMarker(latlng);
        };

        // Store the original onEachFeature function from options
        this._onEachFeature = options.onEachFeature;
        // Bind the onFeatureParse function to the current context and override onEachFeature
        options.onEachFeature = L.Util.bind(onFeatureParse, this);

        // Store the original pointToLayer function from options
        this._pointToLayer = options.pointToLayer;
        // Bind the pointToLayer function to the current context and override pointToLayer
        options.pointToLayer = L.Util.bind(pointToLayer, this);

        // Set the style option to the default style if not already defined
        options.style = options.style || L.Util.extend({}, this.options.styles['default']);
        // Extend the options with the provided options
        L.Util.setOptions(this, options);
        // Extend the styles option with the default styles
        this.options.styles = L.Util.extend({}, this.options.styles);
        // Set the default style to the provided style
        this.options.styles['default'] = L.Util.extend({}, this.options.style);


        // Highlight on mouse over, using global events
        if (this.options.highlight) {
            this.on('mouseover', function(e) {
                var pk = this.getPk(e.layer);
                $(window).trigger('entity:mouseover', {pk: pk, modelname: options.modelname});
            }, this);
            this.on('mouseout', function(e) {
                var pk = this.getPk(e.layer);
                $(window).trigger('entity:mouseout', {pk: pk, modelname: options.modelname});
            }, this);
        }
        // Listen to external events, such as those fired from this layer, and
        // from DOM (in detail pages, see ``hoverable`` CSS selector)
        $(window).on('entity:mouseover', L.Util.bind(function (e, data) {
            if (data.modelname == options.modelname) {
                this.highlight(data.pk, true);
            }
        }, this));
        $(window).on('entity:mouseout', L.Util.bind(function (e, data) {
            if (data.modelname == options.modelname) {
                this.highlight(data.pk, false);
            }
        }, this));


        // Optionnaly make them clickable
        if (this.options.objectUrl) {
            this.on('click', function(e) {
                window.location = this.options.objectUrl(e.layer.properties, e.layer);
            }, this);
        }

        var dataurl = null;
        if (typeof(geojson) == 'string') {
            dataurl = geojson;
            geojson = null;
        }
        L.GeoJSON.prototype.initialize.call(this, geojson, this.options);

        // Fire Leaflet.Spin events
        this.on('loaded loading', function (e) {
            this.fire('data:' + e.type);
        }, this);

        if (dataurl) {
            this.load(dataurl);
        }
    },

    /*
        This function is used to index a layer for quick access
        It is called when a layer is added to the map
        @param layer: The layer to be indexed
        @geojson: The GeoJSON data associated with the layer
     */
    _mapObjects: function (geojson, layer) {
        // Get the primary key (pk) of the GeoJSON object
        var pk = this.getPk(geojson);
        // Store the layer in both _objects and _current_objects
        this._objects[pk] = this._current_objects[pk] = layer;
        // Assign GeoJSON properties to the layer
        layer.properties = geojson.properties;
        // Index the layer for quick access
        this.indexLayer(layer);
        // Handle multi-part geometries by propagating properties to sub-layers
        if (typeof layer.eachLayer == 'function') {
            layer.eachLayer(function (l) {
                l.properties = geojson.properties;
            });
        }
    },

    /*
        This function is used to load GeoJSON data from a URL
        Retrieves the data from the specified URL, parses it,
        and then adds it to the layer
        @param url: The URL from which to load the GeoJSON data
     */
    load: function (url) {
        console.log("load load", url); // Log the URL being loaded

        // Function to handle successful data loading
        var jsonLoad = function (data) {
            // Filter out features with null geometry
            var features = jQuery.grep(data.features, function(obj, i) {
                return obj.geometry !== null;
            });
            data.features = features; // Update the features with the filtered data
            this.addData(data); // Add the GeoJSON data to the layer
            this.loading = false; // Mark loading as complete
            this.fire('loaded'); // Trigger a 'loaded' event
        };

        // Function to handle errors during data loading
        var jsonError = function () {
            this.loading = false; // Mark loading as complete even on error
            this.fire('loaded'); // Trigger a 'loaded' event
            console.error("Could not load url '" + url + "'"); // Log the error to the console
            // Add a CSS class to the map container to indicate an error
            if (this._map) $(this._map._container).addClass('map-error');
        };

        this.loading = true; // Mark loading as in progress
        this.fire('loading'); // Trigger a 'loading' event

        // Perform a GET request to load the GeoJSON data
        $.getJSON(url, L.Util.bind(jsonLoad, this))
         .error(L.Util.bind(jsonError, this)); // Handle errors in the request
    },

    // get a layer by its primary key (pk)
    getLayer: function (pk) {
        return this._objects[pk];
    },

    // get a primary key (pk) from a layer
    getPk: function(layer) {
        // pk (primary-key) in properties
        if (layer.properties && layer.properties.id)
            return layer.properties.id;
        // id of geojson feature
        if (layer.id !== undefined)
            return layer.id;
        // leaflet internal layer id
        return L.Util.stamp(layer);
    },

    // Show all layers matching the pks
    updateFromPks: function(pks) {
        var self = this,
            new_objects = {},
            already_added_layer,
            to_add_layer;

        // Gather all layer to see in new objects
        // Remove them from _current_objects if they are already shown
        // This way _current_objects will only contain layer to be removed
        $.each(pks, function(idx, to_add_pk) {
            already_added_layer = self._current_objects[to_add_pk];
            if (already_added_layer) {
                new_objects[to_add_pk] = already_added_layer;
                delete self._current_objects[to_add_pk];
            } else {
                to_add_layer = new_objects[to_add_pk] = self._objects[to_add_pk];
                // list can be ready before map, on first load
                if (to_add_layer) self.addLayer(to_add_layer);
            }
        });

        // Remove all remaining layers
        $.each(self._current_objects, function(pk, layer) {
            self.removeLayer(layer);
        });

        self._current_objects = new_objects;
    },


    /*
        Return layers currently on map.
        This differs from this._objects, which contains all layers
        loaded from initial GeoJSON data.
    */
    getCurrentLayers: function () {
        return this._current_objects;
    },

    // function to center the map on a layer (a marker, or a polygon, etc)
    jumpTo: function (pk) {
        var layer = this.getLayer(pk);
        if (!layer) return;
        this._map.fitBounds(layer.getBounds()); // resize map to fit layer
    },


    // highlight a layer on mouse over
    highlight: function (pk, on) {
        var layer = this.getLayer(pk);
        on = on === undefined ? true : on;
        if (!layer) return;

        if (on) {
            layer.setStyle(this.options.styles.highlight);
            this.fire('highlight', {layer: layer});
        }
        else {
            this.resetStyle(layer);
        }
    },

    // Reset the style of a layer on mouse out
    select: function(pk, on) {
        var layer = this.getLayer(pk);
        on = on === undefined ? true : on;
        if (!layer) return;

        if (on) {
            layer._defaultStyle = this.options.styles.select;
            layer.setStyle(layer._defaultStyle);
            this.fire('select', {layer: layer});
        }
        else {
            layer._defaultStyle = this.options.styles['default'];
            layer.setStyle(layer._defaultStyle);
        }
    }
});

// Add the LayerIndexMixin to the ObjectsLayer
L.ObjectsLayer.include(L.LayerIndexMixin);
