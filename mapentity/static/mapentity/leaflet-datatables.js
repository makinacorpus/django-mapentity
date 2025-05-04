// This class is used to synchronize a leaflet map with a datatables list
// and a filter form. It will update the map when the list is filtered
L.MapListSync = L.Class.extend({
// Mixin to distribute events to the map
    includes: L.Mixin.Events,
    options: {
        filter: null,
    },
    // the function will be called when a MapListSync object is created
    /*
        * @param datatables: the datatables object
        * @param map: the leaflet map
        * @param objectsLayer: the layer containing the objects
        * @param options: the options for the MapListSync object
     */
    initialize: function (datatables, map, objectsLayer, options) {
        // initialize the MapListSync object with the provided parameters
        this.dt = datatables;
        this.map = map;
        this.layer = objectsLayer;
        L.Util.setOptions(this, options);

        //
        this.selectorOnce = this.__initSelectorOnce(); // TODO: rename this and refactor

        this.layer.on('mouseintent', this._onObjectOver.bind(this));

        this._loading = false; // loading state

        this.map.on('moveend', this._onMapViewChanged, this);

        if (this.options.filter) {
            this.options.filter.submitbutton.click(this._onFormSubmit.bind(this));
            this.options.filter.resetbutton.click(this._onFormReset.bind(this));
        }
        $(this.dt.settings().oInstance).on('filter', this._onListFilter.bind(this));
    },

    // This function is called when the filter is applied
    _onListFilter: function () {
        // Retrieve the value of the filter text input in DataTables
        var filterTxt = $(".dataTables_filter input[type='text']").val();
        // Get the data from the first column of the table
        var results = this.dt.fnGetColumnData(0);
        // Trigger a 'reloaded' event with the number of records
        this.fire('reloaded', {
            nbrecords: results.length,
        });
        // Update the map layer objects with the retrieved primary keys
        this.layer.updateFromPks(results);
    },

    _onMapViewChanged: function (e) {
        if (!this.map._loaded) {
            // leaflet bug, fire again !
            // fixed in unstable version : https://github.com/CloudMade/Leaflet/commit/fbf91fef546125bd4950937fa04ad1bf0f5dc955
            setTimeout(L.Util.bind(function() { this.map.fire('moveend'); }, this), 20);
            return;
        }
        // if the map is loaded, we can set the bounds of the filter form
        this._formSetBounds();
        // and reload the list
        this._reloadList();
    },

    // This function is called when the filter form is submitted
    _onFormSubmit: function (e) {
        // set bounds of the filter form
        this._formSetBounds();
        // refresh the map
        this._reloadList(true);
    },

    // this function is called when the filter form is reset
    _onFormReset: function (e) {
        this._formClear($(this.options.filter.form)); // clear all fields
        this._reloadList();
        this._formSetBounds(); // re-fill current bbox
        //this.layer.updateFromPks(Object.keys(this.layer._objects));
    },


    _onObjectOver: function (e) {
        var self = this;
        var search_pk = e.layer.properties.pk;
    },

    // this function is called when a new row is created in the datatable
    _onRowCreated: function(nRow, aData, iDataIndex ) {
        var self = this;
        var pk = aData[0];
        $(nRow).hover(
            function(){
                self.layer.highlight(pk); // Highlight the object on hover
            },
            function(){
                self.layer.highlight(pk, false); // Remove highlight on hover out
            }
        );

        // Add click event to select the object
        $(nRow).click(function() {
            self.selectorOnce.select(pk, $(nRow)); // Select the object and row
        });

        // Add double-click event to center the map on the object
        $(nRow).dblclick(function() {
            self.layer.jumpTo(pk); // Center the map on the object
        });
    },

    _reloadList: function (refreshLayer) {
        var formData = new FormData(document.querySelector('#mainfilter'));
        var filter = false;

        for (var value of Array.from(formData)) {
            if (value[0] !== 'bbox') {
                if (value[1] !== '') {
                    filter = true;
                }
            }
        }
        if (filter) {
            $('#filters-btn').removeClass('btn-info');
            $('#filters-btn').addClass('btn-warning');
        }
        else {
            $('#filters-btn').removeClass('btn-warning');
            $('#filters-btn').addClass('btn-info');
        }

        // update the datatables url with the filter parameters
        this.dt.ajax.url($('#mainfilter').attr('action') + '?' + $('#mainfilter').serialize()).load();


        if (this._loading)
            return;
        this._loading = true;

        var spinner = new Spinner().spin(this._dtcontainer);

        var self = this;

        // Fonction pour extraire les données et les clés primaires (PK) des objets.
        // `data` : les données JSON retournées par le serveur.
        // `type` : le type de données attendu (non utilisé ici).
        // `callback_args` : un objet pour stocker les clés primaires des objets de la carte.
        var extract_data_and_pks = function(data, type, callback_args) {
            callback_args.map_obj_pk = data.map_obj_pk; // Stocke les PK des objets de la carte.
            return data.aaData; // Retourne les données des objets pour DataTables.
        };

        var on_data_loaded = function (oSettings, callback_args) {
            var nbrecords = self.dt.fnSettings().fnRecordsTotal();
            var nbonmap = Object.keys(self.layer.getCurrentLayers()).length;

            // We update the layer objects, only if forced or
            // if results has more objects than currently shown
            // (i.e. it's a trick to refresh only on zoom out
            //  cf. bug https://github.com/makinacorpus/Geotrek/issues/435)
            if (refreshLayer || (nbrecords > nbonmap)) {
                var updateLayerObjects = function () {
                    self.layer.updateFromPks(callback_args.map_obj_pk);
                    self._onListFilter();
                };

                if (self.layer.loading) {
                    // Layer is not loaded yet, delay object filtering
                    self.layer.on('loaded', updateLayerObjects);
                }
                else {
                    // Do it immediately, but end up drawing.
                    setTimeout(updateLayerObjects, 0);
                }
            }

            self.fire('reloaded', {
                nbrecords: nbrecords,
            });

            spinner.stop();
            self._loading = false;  // loading done.
        };

        // get filtered pks (primary keys)
        // Effectue une requête GET pour récupérer les informations filtrées
        // à partir de l'URL spécifiée dans le formulaire principal.
        $.get($('#mainfilter').attr('action').replace('.datatables', '/filter_infos.json'),
            $('#mainfilter').serialize(),
            function(data) {
                // Met à jour le texte du nombre de résultats avec la valeur retournée.
                $('#nbresults').text(data.count);
                // Met à jour les couches de la carte avec les clés primaires retournées
                this.layer.updateFromPks(data.pk_list);
                // Arrête le spinner d'animation.
                spinner.stop();
                // Indique que le chargement est terminé.
                self._loading = false;  // loading done.
            }.bind(this));

       // Définir l'URL par défaut à partir des options
        var url = this.options.url;
        // Si un filtre est défini, mettre à jour l'URL avec les paramètres du formulaire de filtre
        if (this.options.filter) {
            url = this.options.filter.form.attr("action") + '?' + this.options.filter.form.serialize();
        }
        //this.dt.fnReloadAjax(url, extract_data_and_pks, on_data_loaded);
        return false;
    },

    // Set the bounds of the filter form based on the current map view
    _formSetBounds: function () {
        // Check if the filter option is defined
        if (!this.options.filter)
            return;

        // Ensure the map is loaded before proceeding
        if (!this.map._loaded) {
            console.warn("Map view not set, cannot get bounds.");
            return;
        }

        // Retrieve the current map bounds
        var bounds = this.map.getBounds();

        // Clamp latitude and longitude values to valid ranges
        var min_lat = Math.max(bounds._southWest.lat, -90);
        var max_lat = Math.min(bounds._northEast.lat, 90);
        var min_lon = Math.max(bounds._southWest.lng, -180);
        var max_lon = Math.min(bounds._northEast.lng, 180);

        // Create a rectangle representing the map bounds
        var rect = new L.Rectangle([bounds._northEast, bounds._southWest]);

        // Update the filter's bounding box field with the WKT representation of the rectangle
        this.options.filter.bboxfield.val(L.Util.getWKT(rect));
    },

    // Clear all fields in the form
    _formClear: function ($form) {
        $form.find('input:text, input:password, input:file, input[type=number], select, textarea').val('').trigger('change');
        $form.find('input:radio, input:checkbox, select option')
             .removeAttr('checked').removeAttr('selected');
        $form.find('select').val('').trigger("chosen:updated");
    },

    __initSelectorOnce: function () {
        /**
         * Cette fonction initialise un sélecteur unique pour gérer la sélection
         * des lignes dans une liste et des objets correspondants sur une carte.
         *
         * - Gère la sélection/désélection d'une ligne et met à jour son style.
         * - Gère la sélection/désélection d'un objet sur la carte.
         * - Permet de synchroniser la sélection entre la liste et la carte.
         */
        var self = this;
        var selectorOnce = (function() {
                var current = { 'pk': null, 'row': null }; // Stocke la ligne et l'objet actuellement sélectionnés.

                // Fonction pour gérer l'animation de sélection/désélection des lignes.
                function toggleSelectRow($prevRow, $nextRow) {
                    function nextRowAnim() {
                        if ($nextRow) {
                            $nextRow.hide('fast')
                                    .show('fast', function() { $nextRow.addClass('success'); });
                        }
                    }

                    if ($prevRow) {
                        $prevRow.hide('fast', function() { $prevRow.removeClass('success'); })
                                .show('fast', nextRowAnim);
                    } else {
                        nextRowAnim();
                    }
                }

                // Fonction pour gérer la sélection/désélection d'un objet sur la carte.
                function toggleSelectObject(pk, on) {
                    on = on === undefined ? true : on;
                    self.layer.select(pk, on);
                }

                return {
                    // Fonction principale pour sélectionner/désélectionner une ligne et un objet.
                    'select': function(pk, row) {
                        // Si on clique sur une ligne déjà sélectionnée, on la désélectionne.
                        if (pk == current.pk) {
                            pk = null, row = null;
                        }

                        var prev = current; // Sauvegarde de la sélection précédente.
                        current = {'pk': pk, 'row': row}; // Mise à jour de la sélection actuelle.

                        toggleSelectRow(prev.row, row); // Mise à jour de l'animation des lignes.

                        if (prev.pk && prev.row) {
                            toggleSelectObject(prev.pk, false); // Désélection de l'objet précédent.
                        }
                        if (row && pk) {
                            toggleSelectObject(pk, true); // Sélection du nouvel objet.
                        }
                    }
                };
            })();
        return selectorOnce; // Retourne l'objet `selectorOnce` pour une utilisation ultérieure.
    }
});
