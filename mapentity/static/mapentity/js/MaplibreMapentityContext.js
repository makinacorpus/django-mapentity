class MaplibreMapentityContext {
    constructor(bounds) {
        this.last_sort = {};
        this.bounds = bounds;
    }

    /**
     * This function `getFullContext` captures the full context of the map and its associated elements.
     * It returns an object containing information about the map view, visible layers, form filters,
     * sorted columns, additional information such as the full URL, and a timestamp.
     *
     * @param map - The map object from which to extract the context.
     * @param kwargs - An optional object containing additional parameters:
     */
    getFullContext(map, kwargs = {}) {
        let context = {};
        const filter = kwargs.filter;
        const datatable = kwargs.datatable;

        // Map view (center and zoom level)
        context['mapview'] = {
            'lat': map.getCenter().lat,
            'lng': map.getCenter().lng,
            'zoom': map.getZoom()
        };

        // Visible layers by their name
        const layers = [];
        document.querySelectorAll('div.layer-switcher-menu').forEach(input => {
            layers.push(input.parentNode.textContent.trim());
        });

        const layerList = layers[0].split(" ");
        context['maplayers'] = layerList; // Store the list of visible layers
        console.log('Visible layers:', context['maplayers']);

        // Form filters
        if (filter) {

            const form = document.getElementById(filter);
              // A voir une fois que filter sera mise en place

            const formData = new FormData(form);
            // Filtrer les paires [name, value] en excluant celles dont le name est 'bbox'
            const fields = Array.from(formData).filter(([name, _]) => name !== 'bbox');
            // Convertir les champs filtrés en URLSearchParams
            context['filter'] = new URLSearchParams(fields).toString();

        }

        // Sorted columns
        if (datatable) {
            context['sortcolumns'] = this.last_sort;
        }

        // Additional information useful for screenshots
        context['fullurl'] = window.location.toString();
        context['url'] = window.location.pathname.toString();
        context['viewport'] = {
            'width': window.innerWidth,
            'height': window.innerHeight
        };

        // Add a timestamp
        context['timestamp'] = new Date().getTime();

        return context;
    }

    /**
     * This function `saveFullContext` saves the full context of the map in local storage.
     * It takes a map (`map`) and additional arguments (`kwargs`) as parameters.
     * The context is retrieved via the `getFullContext` function, then serialized to JSON.
     * The context is then stored in localStorage with a prefixed key (if a prefix is provided in `kwargs`).
     * @param map - The map object from which to extract the context.
     * @param kwargs - An optional object containing additional parameters, such as a prefix for the storage key.
     */
    saveFullContext(map, kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const serialized = JSON.stringify(this.getFullContext(map, kwargs)); // Serialize the context
        console.log('Saving context in localstorage:', serialized);
        localStorage.setItem(prefix + 'map-context', serialized);
    }

    /**
     * This function `loadFullContext` loads the full context of the map
     * from local storage (localStorage). It takes an object `kwargs`
     * containing optional arguments, such as a prefix for the storage key.
     * If a context is found, it is deserialized from JSON and returned.
     * Otherwise, the function returns `null`.
     * @param kwargs - An optional object containing additional parameters, such as a prefix for the storage key.
     * @returns {any|null}
     */
    loadFullContext(kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const context = localStorage.getItem(prefix + 'map-context');
        if (context) {
            return JSON.parse(context);
        }
        return null;
    }

    /**
     * This function `restoreLatestMapView` restores the most recent map view based on saved contexts.
     * @param map
     * @param prefixes
     * @param kwargs
     * @returns {boolean}
     */
    restoreLatestMapView(map, prefixes, kwargs = {}) {
        let latest = null; // Variable to store the most recent context
        for (const prefix of prefixes) {
            // Load the context corresponding to the current prefix
            const context = this.loadFullContext({ ...kwargs, prefix });
            // Update the most recent context if the current context is more recent
            if (!latest || (context && context.timestamp && context.timestamp > latest.timestamp)) {
                latest = context;
            }
        }
        // Restore the map view using the most recent context
        return this.restoreMapView(map, latest, kwargs);
    }


    /**
     * Restores the map view based on the provided context.
     * @param map
     * @param context
     * @param kwargs
     * @returns {boolean}
     */
    restoreMapView(map, context, kwargs = {}) {
        // If no context is provided, load the context from local storage.
        if (!context) {
            context = this.loadFullContext(kwargs);
        }

        // Check if a valid context is available.
        if (context !== null) {
            // If the context contains map view information.
            if (context && context.mapview) {
                // Set the map view with the coordinates and zoom level from the context.
                map.setCenter([context.mapview.lng, context.mapview.lat]);
                map.setZoom(context.mapview.zoom);
                return true; // Indicate that the restoration was successful.
            } else {
                // If the map is defined.
                if (map !== null) {

                    map.fitBounds(this.bounds, {padding : 0}); // Adjust the map to fit the predefined bounds.

                    // Pas utile du moment maxZoom n'est pas défini dans les options de la carte
                    // de plus les bounds rend impossible de zoomer au delà de la limite, si la distance définie
                    // par bounds vaut environ 50km, on ne peut pas zoomer au delà de 50km

                    // If the reset view control is available.
                    // if (map.getResetViewControl() !== null) {
                    //     // Adjust the map to fit the bounds defined by the control.
                    //     map.fitBounds(map.getResetViewControl().getBounds());
                    //     // Get the maximum allowed zoom level.
                    //     const maxZoom = map.getContainer().getAttribute('data-fitmaxzoom');
                    //     // If the current zoom level exceeds the maximum allowed.
                    //     if (map.getZoom() > maxZoom) {
                    //         // Display a message in the console and adjust the zoom level.
                    //         console.log('Limited zoom to ', maxZoom, '. Was ', map.getZoom());
                    //         map.setZoom(maxZoom);
                    //     }
                    // }
                }
            }
            return false; // Indicate that the restoration failed.
        }
    }

    /**
     * Restores the full context of the map, including filters, sorted columns, and map layers.
     * @param map
     * @param context
     * @param kwargs
     */
    restoreFullContext(map, context, kwargs = {}) {
        // Check if additional arguments (kwargs) are provided, otherwise initialize to an empty object.
        const filter = kwargs.filter;
        const datatable = kwargs.datatable;
        const objectsname = kwargs.objectsname; // The name of the objects layer, used to display the layer in the layer switcher. (modelname)

        // If no context is provided or if the context is not an object, try to load it from local storage.
        if (!context || typeof context !== 'object') {
            context = this.loadFullContext(kwargs);
        }
        // If no context is found, display a warning and adjust the map to the maximum bounds.
        if (!context) {
            console.warn("No context found.");
            map.fitBounds(map.options.maxBounds);
            return;
        }

        // Restore filters if a filter and filter context are available.
        if (filter && context.filter) {
            const formData = new URLSearchParams(context.filter);
            formData.forEach(( key, value) => {
                const input = filter.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        input.checked = true;
                    } else {
                        input.value = value;
                    }
                }
            });
            filter.querySelectorAll('select').forEach(select => {
                select.dispatchEvent(new Event('change'));
            });
        }

        // Restore sorted columns if a datatable and sorted columns are available.
        if (datatable && context.sortcolumns) {
            this.last_sort = context['sortcolumns'];
        }

        // Restore the map view based on the context.
        this.restoreMapView(map, context, kwargs);

        // Display the map layers based on their names.
        if (context.maplayers) {
            const layers = context.maplayers;
            layers.push(objectsname);
            document.querySelectorAll('div.layer-switcher-menu input[type="checkbox"]').forEach(input => {
                // Uncheck layers that do not match the object's name.
                if (input.parentNode.textContent.trim() !== objectsname) {
                    input.checked = false;
                }
            });

            // Check layers corresponding to the names in the context.
            for (const layer of layers) {
                document.querySelectorAll('div.layer-switch-menu input').forEach(input => {
                    if (input.parentNode.textContent.trim() === layer) {
                        input.checked = true;
                    }
                });
            }

            // Update layer controls if available.
            // if ((map.layerscontrol !== undefined) && !!map.layerscontrol._map) {
            //     map.layerscontrol._onInputClick();
            // }

        }

        // Disable tile animations if the context is in print mode.
        // if (context.print) {
        //     map.getContainer().classList.remove('leaflet-fade-anim');
        // }

        // Trigger a change event on the filter selections.
        filter.querySelectorAll('select').forEach(select => {
            select.dispatchEvent(new Event('change'));
        });
    }
}
