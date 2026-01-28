class MaplibreMapentityContext {
    /**
     * Conctructeur de la classe MaplibreMapentityContext.
     * @param bounds {Array} - Un tableau contenant les coordonnées des limites de la carte, sous la forme [[swLng, swLat], [neLng, neLat]].
     * @param layerManager {MaplibreLayerManager}
     */
    constructor(bounds, layerManager) {
        this.last_sort = {};
        this.bounds = bounds;
        this.layerManager = layerManager;
    }

    /**
     * Récupère le contexte complet de la carte, y compris la vue actuelle, les couches visibles, les filtres et les colonnes triées.
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre GL JS.
     * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'filter' pour les filtres de formulaire et 'datatable' pour les colonnes triées.
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
                layers.push(label.textContent.trim());
            }
        });

        context['maplayers'] = layers; // Store the list of visible layers

        // Form filters
        if (filter) {

            const form = document.getElementById(filter);
              // A voir une fois que filter sera mise en place

            const formData = new FormData(form);
            // Filtrer les paires [name, value] en excluant celles dont le name est 'bbox' ou ''
            const fields = Array.from(formData).filter(([name, value]) => (name !== 'bbox' && value !== ''));
            context['filter'] = new URLSearchParams(fields).toString();
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
        // ajout de la classe pour les tiles chargées permettant par la suite à screamshotter de réaliser une capture d'écran
        map.getContainer().classList.add('maplibre-tile-loaded');

        return context;
    }

    /**
     * Sauvegarde le contexte complet de la carte dans le stockage local (localStorage).
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre GL JS.
     * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'prefix' pour le préfixe de la clé de stockage.
     */
    saveFullContext(map, kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const serialized = JSON.stringify(this.getFullContext(map, kwargs));
        localStorage.setItem(prefix + 'map-context', serialized);
    }

    /**
     * Charge le contexte complet de la carte depuis le stockage local (localStorage).
     * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'prefix' pour le préfixe de la clé de stockage.
     * @returns {any|null} - Retourne le contexte chargé depuis le stockage local, ou null si aucun contexte n'est trouvé.
     */
    loadFullContext(kwargs = {}) {
        const prefix = kwargs.prefix || '';
        const context = localStorage.getItem(prefix + 'map-context');
        if (context) {
            return JSON.parse(context);
        }
        return null;
    }

    // /**
    //  * Restores le dernier contexte de la carte.
    //  * @param map {maplibregl.Map} - L'instance de la carte Maplibre GL JS.
    //  * @param prefixes {Array} - Un tableau de préfixes pour rechercher le contexte dans le stockage local.
    //  * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'prefix' pour le préfixe de la clé de stockage.
    //  * @returns {boolean} - Retourne true si la restauration a réussi, sinon false.
    //  */
    // restoreLatestMapView(map, prefixes, kwargs = {}) {
    //     let latest = null;
    //     for (const prefix of prefixes) {
    //         const context = this.loadFullContext({ ...kwargs, prefix });
    //         if (!latest || (context && context.timestamp && context.timestamp > latest.timestamp)) {
    //             latest = context;
    //         }
    //     }
    //     return this.restoreMapView(map, latest, kwargs);
    // }


    /**
     * Restores la vue de la carte à partir du contexte fourni ou du contexte chargé depuis le stockage local.
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre GL JS.
     * @param context {Object|null} - Le contexte de la carte à restaurer. Si null, le contexte sera chargé depuis le stockage local.
     * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'prefix' pour le préfixe de la clé de stockage.
     * @returns {boolean} - Retourne true si la restauration de la vue de la carte a réussi, sinon false.
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
            console.warn("Niveau de zoom manquant ou invalide — setZoom ignoré.");
        }

        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            map.setCenter([lng, lat]);
        } else {
            console.warn("Longitude ou latitude manquante ou invalide — setCenter ignoré.");
        }

        return true;
    }



    /**
     * Restores le contexte complet de la carte, y compris les filtres, les colonnes triées et les couches visibles.
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre GL JS.
     * @param context {Object|null} - Le contexte de la carte à restaurer. Si null, le contexte sera chargé depuis le stockage local.
     * @param kwargs {Object} - Un objet contenant des paramètres optionnels, tels que 'filter' pour les filtres de formulaire, 'datatable' pour les colonnes triées et 'objectsLayer' pour la couche d'objets.
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
            map.fitBounds(this.bounds);
            return;
        }

         // Restore filters if a filter and filter context are available.
         console.debug('Restoring filters:', filter, context.filter);
         if (filter && context.filter) {
             const formData = new URLSearchParams(context.filter);
             const params = {};

             // Charger les filtres
             await load_filter_form();

             // S'assurer que 'filter' est un élément DOM
             const filterElement = typeof filter === 'string' ? document.getElementById(filter) : filter;
             if (!filterElement) {
                 return;
             }

             // Convertir les données en objet clé/valeur
             for (const [key, value] of formData.entries()) {
                 params[key] = value;
             }

             // Appliquer les valeurs aux champs du formulaire
             for (const [key, value] of Object.entries(params)) {
                 const input = filterElement.querySelector(`[name="${key}"]`);
                 if (input) {
                     if (input.type === 'checkbox' || input.type === 'radio') {
                         input.checked = value === 'true' || value === 'on';
                     } else {
                         input.value = value;
                     }
                 }
             }

             // Déclencher les événements 'change' pour les <select>
             filterElement.querySelectorAll('select').forEach(select => {
                 select.dispatchEvent(new Event('change'));
             });
         }

         // Restore le dernier tri des colonnes si un datatable est fourni et que des colonnes de tri sont spécifiées dans le contexte.
         //if (datatable && context.sortcolumns) {
         //    this.last_sort = context['sortcolumns'];
         //}

        // restore la vue de la carte à partir du contexte.
        this.restoreMapView(map, context, kwargs);

        // Affichage des couches visibles dans le sélecteur de couches.
        if (context.maplayers) {
            const layers = context.maplayers;
            const layerLabels = document.querySelectorAll('.layer-switcher-menu label');

            // Traitement des cases à cocher (checkbox)
            layerLabels.forEach(label => {
                const input = label.querySelector('input');
                if (!input || input.type !== 'checkbox') {
                    return;
                }

                const labelText = label.textContent.trim();
                input.checked = layers.includes(labelText);
                if (input.checked) {
                    input.dispatchEvent(new Event("change"));
                }
            });

            // Traitement des boutons radio
            layerLabels.forEach(label => {
                const input = label.querySelector('input');
                if (!input || input.type !== 'radio') {
                    return;
                }

                const layerId = input.dataset.layerId;
                if (layers.includes(layerId?.replace('-base', ''))) {
                    input.checked = true;
                    this.layerManager.toggleLayer(layerId);
                } else {
                    input.checked = false;
                }
            });
        }

    }
}
