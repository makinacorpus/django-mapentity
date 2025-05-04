// MapEntity.Context est un objet contenant des méthodes et des propriétés,
// mais il n'est pas instanciable comme une classe.
MapEntity.Context = new function() {
    var self = this;
    var last_sort = {};

    /*
     * Cette fonction `getFullContext` permet de capturer le contexte complet de la carte et de ses éléments associés.
     * Elle retourne un objet contenant des informations sur la vue de la carte, les couches visibles, les filtres de formulaire,
     * les colonnes triées, des informations supplémentaires comme l'URL complète, et un horodatage.
     */
    self.getFullContext = function(map, kwargs) {
        var context = {},
            filter = kwargs && kwargs.filter, // Filtre optionnel passé dans les arguments
            datatable = kwargs && kwargs.datatable; // Table de données optionnelle passée dans les arguments

        // Vue de la carte (centre et niveau de zoom)
        context['mapview'] = {'lat': map.getCenter().lat, 'lng': map.getCenter().lng, 'zoom': map.getZoom()};

        // Couches visibles par leur nom
        var layers = [];
        $('form.leaflet-control-layers-list input:checked').each(function () {
            layers.push($.trim($(this).parent().text())); // Ajoute le nom des couches cochées
        });
        context['maplayers'] = layers;

        // Filtres de formulaire
        if (filter) {
            // Exclut le champ bbox, car il provient de la vue de la carte
            var fields = $($(filter).serializeArray()).filter(function (){ return this.name != 'bbox';});
            context['filter'] = $.param(fields); // Sérialise les champs restants
        }

        // Colonnes triées
        if (datatable) {
            context['sortcolumns'] = last_sort; // Utilise la dernière configuration de tri
            // context['sortcolumns'][$('body').attr('data-modelname')] = datatable.fnSettings().aaSorting;
        }

        // Informations supplémentaires utiles pour les captures d'écran
        context['fullurl'] = window.location.toString(); // URL complète
        context['url'] = window.location.pathname.toString(); // Chemin de l'URL
        context['viewport'] = {'width': $(window).width(), 'height': $(window).height()}; // Dimensions de la fenêtre

        // Ajoute un horodatage
        context['timestamp'] = new Date().getTime();

        return context; // Retourne l'objet contexte
    };

    // Cette fonction `saveFullContext` permet de sauvegarder le contexte complet de la carte dans le stockage local (localStorage).
    // Elle prend en paramètre une carte (`map`) et des arguments supplémentaires (`kwargs`).
    // Le contexte est récupéré via la fonction `getFullContext`, puis sérialisé en JSON.
    // Le contexte est ensuite stocké dans le localStorage avec une clé préfixée (si un préfixe est fourni dans `kwargs`).
    self.saveFullContext = function(map, kwargs) {
        var prefix = kwargs.prefix || '', // Préfixe optionnel pour la clé de stockage
            serialized = JSON.stringify(self.getFullContext(map, kwargs)); // Sérialisation du contexte
        localStorage.setItem(prefix + 'map-context', serialized); // Sauvegarde dans le localStorage
    };

    // Cette fonction `__loadFullContext` permet de charger le contexte complet de la carte
    // depuis le stockage local (localStorage). Elle prend en paramètre un objet `kwargs`
    // contenant des arguments optionnels, comme un préfixe pour la clé de stockage.
    // Si un contexte est trouvé, il est désérialisé depuis JSON et retourné.
    // Sinon, la fonction retourne `null`.
    self.__loadFullContext = function(kwargs) {
        if (!kwargs) kwargs = {}; // Initialise `kwargs` s'il est indéfini
        var prefix = kwargs.prefix || '', // Utilise un préfixe vide par défaut
            context = localStorage.getItem(prefix + 'map-context'); // Récupère le contexte depuis localStorage
        if (context)
            return JSON.parse(context); // Désérialise et retourne le contexte
        return null; // Retourne `null` si aucun contexte n'est trouvé
    };

    // Cette fonction `restoreLatestMapView` permet de restaurer la vue la plus récente de la carte
    // en fonction des contextes sauvegardés. Elle prend en paramètre une carte (`map`), une liste
    // de préfixes (`prefixes`) et des arguments supplémentaires (`kwargs`).
    self.restoreLatestMapView = function (map, prefixes, kwargs) {
        var latest = null; // Variable pour stocker le contexte le plus récent
        for (var i = 0; i < prefixes.length; i++) {
            var prefix = prefixes[i],
                // Charge le contexte correspondant au préfixe actuel
                context = self.__loadFullContext($.extend(kwargs, {prefix: prefix}));
            // Met à jour le contexte le plus récent si le contexte actuel est plus récent
            if (!latest || (context && context.timestamp && context.timestamp > latest.timestamp)) {
                latest = context;
                console.debug(JSON.stringify(context)); // Affiche le contexte dans la console pour débogage
            }
        }
        // Restaure la vue de la carte en utilisant le contexte le plus récent
        return self.restoreMapView(map, latest, kwargs);
    };

    // Cette fonction `restoreMapView` permet de restaurer la vue de la carte
    // en fonction d'un contexte donné. Elle prend en paramètres une carte (`map`),
    // un contexte (`context`) et des arguments supplémentaires (`kwargs`).
    self.restoreMapView = function(map, context, kwargs) {
        // Si aucun contexte n'est fourni, charge le contexte depuis le stockage local.
        if (!context) context = self.__loadFullContext(kwargs);

        // Vérifie si un contexte valide est disponible.
        if (context !== null) {
            // Si le contexte contient des informations sur la vue de la carte.
            if (context && context.mapview) {
                // Définit la vue de la carte avec les coordonnées et le niveau de zoom du contexte.
                map.setView(L.latLng(context.mapview.lat, context.mapview.lng), context.mapview.zoom);
                return true; // Indique que la restauration a réussi.
            } else {
                // Si la carte est définie.
                if (map !== null) {
                    // Si le contrôle de réinitialisation de la vue est disponible.
                    if (map.resetviewControl !== null) {
                        // Ajuste la carte pour s'adapter aux limites définies par le contrôle.
                        map.fitBounds(map.resetviewControl.getBounds());
                        // Récupère le niveau de zoom maximal autorisé.
                        var maxZoom = $(map._container).data('fitmaxzoom');
                        // Si le niveau de zoom actuel dépasse le maximum autorisé.
                        if (map.getZoom() > maxZoom) {
                            // Affiche un message dans la console et ajuste le niveau de zoom.
                            console.log('Limited zoom to ', maxZoom, '. Was ', map.getZoom());
                            map.setZoom(maxZoom);
                        }
                    }
                }
            }
            return false; // Indique que la restauration a échoué.
        }
    };

    self.restoreFullContext = function(map, context, kwargs) {
    // Vérifie si des arguments supplémentaires (kwargs) sont fournis, sinon les initialise à un objet vide.
    if (!kwargs) kwargs = {};
    var filter = kwargs.filter, // Filtre optionnel.
        datatable = kwargs.datatable, // Table de données optionnelle.
        objectsname = kwargs.objectsname; // Nom des objets optionnel.

    // Si aucun contexte n'est fourni ou si le contexte n'est pas un objet, tente de le charger depuis le stockage local.
    if (!context || typeof context != 'object') {
        context = self.__loadFullContext(kwargs);
    }
    // Si aucun contexte n'est trouvé, affiche un avertissement et ajuste la carte aux limites maximales.
    if (!context) {
        console.warn("No context found.");
        map.fitBounds(map.options.maxBounds);
        return;  // Arrête l'exécution si aucun contexte n'est disponible.
    }

    // Restaure les filtres si un filtre et un contexte de filtre sont disponibles.
    if (filter && context.filter) {
        $(filter).deserialize(context.filter); // Désérialise les filtres.
        $(filter).find('select').trigger("chosen:updated"); // Met à jour les sélections.
    }

    // Restaure les colonnes triées si une table de données et des colonnes triées sont disponibles.
    if (datatable && context.sortcolumns) {
        if ($('body').attr('data-modelname') in context.sortcolumns) {
            //datatable.fnSort(context.sortcolumns[$('body').attr('data-modelname')]); // (Commenté dans le code original)
        }
        last_sort = context['sortcolumns']; // Met à jour la dernière configuration de tri.
    }

        // Restaure la vue de la carte en fonction du contexte.
        self.restoreMapView(map, context, kwargs);

        // Affiche les couches de la carte en fonction de leurs noms.
        if (context.maplayers) {
            var layers = context.maplayers;
            layers.push(objectsname); // Ajoute le nom des objets aux couches.
            $('form.leaflet-control-layers-list input:checkbox').each(function () {
                // Décoche les couches qui ne correspondent pas au nom des objets.
                if ($.trim($(this).parent().text()) != objectsname) {
                    $(this).removeAttr('checked');
                }
            });
            // Coche les couches correspondant aux noms dans le contexte.
            for(var i=0; i<layers.length; i++) {
                var layer = layers[i];
                $('form.leaflet-control-layers-list input').each(function () {
                    if ($.trim($(this).parent().text()) == layer) {
                        $(this).attr('checked', 'checked');
                    }
                });
            }
            // Met à jour les contrôles de couches si disponibles.
            if ((map.layerscontrol !== undefined)  && !!map.layerscontrol._map) {
                map.layerscontrol._onInputClick();
            }
        }

        // Désactive les animations des tuiles si le contexte est en mode impression.
        if (context.print) {
            $(map._container).removeClass('leaflet-fade-anim');
        }
        // Déclenche un événement de changement sur les sélections du filtre.
        $(filter).find('select').trigger("change");
    };
};
