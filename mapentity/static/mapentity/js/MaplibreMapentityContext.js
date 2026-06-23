class MaplibreMapentityContext {
    /**
     * MaplibreMapentityContext class constructor.
     * @param bounds {Array} - An array containing the map boundary coordinates, in the format [[swLng, swLat], [neLng, neLat]].
     * @param layerManager {MaplibreLayerManager}
     */
    constructor(bounds, layerManager) {
        this.last_sort = {};
        this.bounds = bounds;
        this.layerManager = layerManager;
    }

    /**
     * Retrieves the complete map context, including the current view, visible layers, filters, and sorted columns.
     * @param map {maplibregl.Map} - The Maplibre GL JS map instance.
     * @param kwargs {Object} - An object containing optional parameters, such as 'filter' for form filters and 'datatable' for sorted columns.
     */
    getFullContext(map, kwargs = {}) {
        let context = {};
        const filter = kwargs.filter;
        const datatable = kwargs.datatable;

        context['mapview'] = {
            'lat': map.getCenter().lat,
            'lng': map.getCenter().lng,
            'zoom': map.getZoom()
        };

        const layers = [];

        document.querySelectorAll('.layer-switcher-menu label').forEach(label => {
            const inputElement = label.querySelector('input');
            if(inputElement && inputElement.checked) {
                // We retrieve the raw text of the label (without any HTML tags for icons)
                const labelText = label.textContent.trim();
                layers.push(labelText);
            }
        });

        context['maplayers'] = layers; // Store the list of visible layers

        // Form filters
        if (filter) {
            const form = document.getElementById(filter);

            if (form) {
                const formData = new FormData(form);
                // Filter the [name, value] pairs, excluding those where the name is 'bbox' or ''.
                const fields = Array.from(formData).filter(([name, value]) => (name !== 'bbox' && value !== ''));
                context['filter'] = new URLSearchParams(fields).toString();
            }
        }

        if (datatable) {
            context['sortcolumns'] = this.last_sort;
        }

        context['fullurl'] = window.location.toString();
        context['url'] = window.location.pathname.toString();
        context['viewport'] = {
            'width': window.innerWidth,
            'height': window.innerHeight
        };

        context['timestamp'] = new Date().getTime();
        // Addition of the class for loaded tiles, allowing screamshotter to subsequently take a screenshot
        map.getContainer().classList.add('maplibre-tile-loaded');

        return context;
    }

    /**
     * Saves the complete map context to local storage (localStorage).
     * @param map {maplibregl.Map} - The Maplibre GL JS map instance.
     * @param kwargs {Object} - An object containing optional parameters, such as 'prefix' for the storage key prefix.
     */
    saveFullContext(map, kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const serialized = JSON.stringify(this.getFullContext(map, kwargs));
        localStorage.setItem(prefix + 'map-context', serialized);
    }

    /**
     * Stores a context (typically received via URL) in localStorage.
     * Allows for unified restoration: URL → localStorage → normal restoration.
     * @param context {Object} - The context to store.
     * @param kwargs {Object} - An object containing optional parameters, such as 'prefix' for the storage key prefix.
     */
    saveContextToLocalStorage(context, kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const serialized = JSON.stringify(context);
        localStorage.setItem(prefix + 'map-context', serialized);
    }

    /**
     * Load the complete map context from local storage.
     * @param kwargs {Object} - An object containing optional parameters, such as 'prefix' for the storage key prefix.
     * @returns {any|null} - Returns the context loaded from local storage, or null if no context is found.
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
     * Adds a value to a select input by selecting the matching option.
     * Works with single and multiple select elements without clearing
     * previously selected values.
     *
     * @param {HTMLSelectElement} input - The select element.
     * @param {string} value - The value to select.
     * @returns {void}
     */
    addValue(input, value) {
        const option = input.querySelector(`option[value="${value}"]`);
        if (option) {
            option.selected = true; // preserves existing selections
            input.dispatchEvent(new Event('change'));
        }
    }


    /**
     * Restores the map view from the provided context or the context loaded from local storage.
     * @param map {maplibregl.Map} - The Maplibre GL JS map instance.
     * @param context {Object|null} - The map context to restore. If null, the context will be loaded from local storage.
     * @param kwargs {Object} - An object containing optional parameters, such as 'prefix' for the storage key prefix.
     * @returns {boolean} - Returns true if the map view restoration was successful, otherwise false.
     */
    restoreMapView(map, context, kwargs = {}) {
        if (context === null || map === null) {
            return false;
        }

        const lng = context?.mapview?.lng;
        const lat = context?.mapview?.lat;
        const zoom = context?.mapview?.zoom;

        if (Number.isFinite(zoom)) {
            map.setZoom(zoom);
        } else {
            console.warn("Zoom level missing or invalid — setZoom ignored.");
        }

        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            map.setCenter([lng, lat]);
        } else {
            console.warn("Longitude or latitude missing or invalid — setCenter ignored.");
        }

        return true;
    }

    /**
     * Restores the filter form context using the provided form data.
     * @async
     * @param {HTMLElement|string} filter - The filter form DOM element or its ID.
     * @param {FormData} formData - The form data to restore, typically retrieved from storage or a request.
     * @returns {Promise<void>} - Resolves when all form fields have been restored.
     */
    async restoreFilterContext(filter, formData){
        // Ensure 'filter' is a DOM element
        const filterElement = typeof filter === 'string' ? document.getElementById(filter) : filter;
        if (!filterElement) {
            return;
        }

        const params = {};

        // Apply values to form fields
        for (const [key, value] of formData.entries()) {
            const input = filterElement.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = value === 'true' || value === 'on';
                } else if (input.tagName === 'SELECT') {
                    if (input.hasAttribute('data-autocomplete-light-url')){
                        const autocompleteUrl = input.getAttribute('data-autocomplete-light-url');
                        const url = new URL(autocompleteUrl, window.location.origin);
                        url.searchParams.set("id", value);

                        const response = await fetch(url.pathname + url.search, {
                            method: 'GET'
                        });

                        const data = await response.json();

                        // create the option and append to Select2
                        const option = new Option(data.text, data.id, true, true);
                        input.append(option);

                        input.dispatchEvent(new Event('change'));
                        input.dispatchEvent(new CustomEvent('select2:select', {
                            detail: { data: data }
                        }));
                    } else {
                        this.addValue(input, value);
                    }
                } else {
                    input.value = value;
                }
            }
        }

        // Trigger the 'change' events for the <select>
        filterElement.querySelectorAll('select').forEach(select => {
            select.dispatchEvent(new Event('change'));
        });
    }

    /**
     * Restores the full map context, including filters, sorted columns, and visible layers.
     * @param map {maplibregl.Map} - The Maplibre GL JS map instance.
     * @param context {Object|null} - The map context to restore. If null, the context will be loaded from local storage.
     * @param kwargs {Object} - An object containing optional parameters, such as 'filter' for form filters, 'datatable' for sorted columns, and 'objectsLayer' for the objects layer.
     */
    async restoreFullContext(map, context, kwargs = {}) {
        const filter = kwargs.filter;
        const objectsname = kwargs.objectsname; // The name of the objects layer, used to display the layer in the layer switcher. (modelname)
        const datatable = kwargs.datatable;
        const objectsLayer = kwargs.objectsLayer;
        const load_filter_form = kwargs.load_filter_form;

        if (!context || typeof context !== 'object') {
            // If not received from URL, load from LocalStorage
            context = this.loadFullContext(kwargs);
        }

        if (!context) {
            console.warn("No context found.");
            // Mark as "restored" even without context so that saveContext can work
            this.layerManager.restoredContext = { empty: true };
            map.fitBounds(this.bounds, { animate: false });
            return;
        }

         // Restore filters if a filter and filter context are available.
         console.debug('Restoring filters:', filter, context.filter);
         if (filter && context.filter) {
             const formData = new URLSearchParams(context.filter);

             // Charger les filtres
             await load_filter_form(() => this.restoreFilterContext(filter, formData));
         }

        // restore the map view from the context.
        this.restoreMapView(map, context, kwargs);

        // Store and restore context in layerManager for async layers
        this.layerManager.restoredContext = context;

        // Display visible layers in the layer switcher.
        if (context.maplayers) {
            const layers = context.maplayers;
            const layerLabels = document.querySelectorAll('.layer-switcher-menu label');

            layerLabels.forEach(label => {
                const input = label.querySelector('input');
                if (!input) return;

                const labelText = label.textContent.trim();
                const isRestored = layers.includes(labelText);

                if (isRestored) {
                    input.checked = true;
                    if (input.type === 'radio') {
                        const layerId = input.dataset.layerId;
                        this.layerManager.toggleLayer(layerId, true);
                    } else {
                        input.dispatchEvent(new Event("change"));
                    }
                }
            });
        }

    }
}
