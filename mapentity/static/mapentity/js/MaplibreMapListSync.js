class MaplibreMapListSync {
    constructor(datatable, map, objectsLayer, togglableFiltre, history) {
        this.dt = datatable;
        this.map = map;
        this.layer = objectsLayer;
        this.togglableFiltre = togglableFiltre; // Initialize the filter
        this.history = history;
        this.options = {
            filter: {
                form: document.getElementById('mainfilter'),
                submitbutton: document.getElementById('filter'),
                resetbutton: document.getElementById('reset'),
                bboxfield: document.getElementById('id_bbox'),
            }
        };
        this._loading = false; // loading state
        // this.spinner = new CustomSpinner(document.body); // Initialize the custom spinner

        this.initialize();
    }

    initialize() {
        this.selectorOnce = this.__initSelectorOnce();

        this.map.onMoveEnd = (e) => this._onMapViewChanged(e);

        if (this.options.filter) {
            this.options.filter.submitbutton.addEventListener('click', (e) => this._onFormSubmit(e));
            this.options.filter.resetbutton.addEventListener('click', (e) => this._onFormReset(e));
        }

        this.dt.onFilter = () => this._onListFilter();
    }

    _onListFilter() {
        // Retrieve the value of the filter text input in DataTables
        const filterTxt = document.querySelector(".dataTables_filter input[type='text']").value;
        // Get the data from the first column of the table
        const results = this.dt.column(0).data().toArray();
        // Update the map layer objects with the retrieved primary keys
        this.layer.updateFromPks(results);
        // Call a method to handle the reloaded logic
        this._handleReloaded(results.length);
    }

    _handleReloaded(nbrecords) {
        // Affiche et sauvegarde le nombre de résultats
        this.history.saveListInfo({ model: this.options.modelname, nb: nbrecords });
        // Call the setsubmit method of the togglableFiltre object
        this.togglableFiltre.setsubmit();
    }

    _onMapViewChanged(e) {
        if (!this.map.loaded()) {
            // MapLibre equivalent of leaflet bug handling
            setTimeout(() => this.map.onMoveEnd(e), 20);
            return;
        }
        // If the map is loaded, we can set the bounds of the filter form
        this._formSetBounds();
        // And reload the list
        this._reloadList();
    }

    _onFormSubmit(e) {
        // Set bounds of the filter form
        this._formSetBounds();
        // Refresh the map
        this._reloadList(true);
    }

    _onFormReset(e) {
        this._formClear(this.options.filter.form); // Clear all fields
        this._reloadList();
        this._formSetBounds(); // Re-fill current bbox
    }

    _onRowCreated(nRow, aData, iDataIndex) {
        const pk = aData[0];
        nRow.addEventListener('mouseenter', () => this.layer.highlight(pk));
        nRow.addEventListener('mouseleave', () => this.layer.highlight(pk, false));

        // Add click event to select the object
        nRow.addEventListener('click', () => this.selectorOnce.select(pk, nRow));

        // Add double-click event to center the map on the object
        nRow.addEventListener('dblclick', () => this.layer.jumpTo(pk));
    }

    async _reloadList(refreshLayer) {
        const formData = new FormData(this.options.filter.form);
        let filter = false;

        for (const value of formData.values()) {
            if (value.name !== 'bbox') {
                if (value.value !== '') {
                    filter = true;
                }
            }
        }

        if (filter) {
            document.getElementById('filters-btn').classList.remove('btn-info');
            document.getElementById('filters-btn').classList.add('btn-warning');
        } else {
            document.getElementById('filters-btn').classList.remove('btn-warning');
            document.getElementById('filters-btn').classList.add('btn-info');
        }

        // Update the datatables URL with the filter parameters
        let url = `${this.options.filter.form.getAttribute('action')}?${new URLSearchParams(formData).toString()}`;
        this.dt.ajax.url(url).load();

        if (this._loading) return;
        this._loading = true;

        // this.spinner.show(); // Show the spinner

        try {
            // Function to extract data and primary keys (PK) from objects
            const extract_data_and_pks = (data) => {
                this.layer.updateFromPks(data.map_obj_pk); // Store the PKs of the map objects
                return data.aaData; // Return the object data for DataTables
            };

            const on_data_loaded = (oSettings, callback_args) => {
                const nbrecords = this.dt.page.info().recordsTotal;
                const nbonmap = Object.keys(this.layer.getCurrentLayers()).length;

                // Update the layer objects, only if forced or if results have more objects than currently shown
                if (refreshLayer || (nbrecords > nbonmap)) {
                    this.map.on('layers:added', () => {
                        this.layer.updateFromPks(callback_args.map_obj_pk);
                        this._onListFilter();
                    });

                    // Déclenche manuellement l'événement si la couche est déjà chargée
                    this.map.fire && this.map.fire('layers:added');
                }

                this._handleReloaded(nbrecords);

                // this.spinner.hide(); // Hide the spinner
                this._loading = false; // Indicate that loading is done
            };

            // Get filtered primary keys (PKs)
            const response = await fetch(`${this.options.filter.form.getAttribute('action').replace('.datatables', '/filter_infos.json')}?${new URLSearchParams(formData)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            // Update the text of the number of results with the returned value
            document.getElementById('nbresults').textContent = data.count;
            // Update the map layers with the returned primary keys
            this.layer.updateFromPks(data.pk_list);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            // this.spinner.hide(); // Hide the spinner
            this._loading = false; // Indicate that loading is done
        }

        // Set the default URL from options
        url = this.options.url;
        // If a filter is defined, update the URL with the filter form parameters
        if (this.options.filter) {
            url = `${this.options.filter.form.getAttribute("action")}?${new URLSearchParams(formData)}`;
        }
        // this.dt.ajax.reload(url, extract_data_and_pks, on_data_loaded);
        return false;
    }

    _formSetBounds() {
        // Check if the filter option is defined
        if (!this.options.filter) return;

        // Ensure the map is loaded before proceeding
        if (!this.map.loaded()) {
            console.warn("Map view not set, cannot get bounds.");
            return;
        }

        // Retrieve the current map bounds
        const bounds = this.map.getBounds();

        // Clamp latitude and longitude values to valid ranges
        const min_lat = Math.max(bounds.getSouthWest().lat, -90);
        const max_lat = Math.min(bounds.getNorthEast().lat, 90);
        const min_lon = Math.max(bounds.getSouthWest().lng, -180);
        const max_lon = Math.min(bounds.getNorthEast().lng, 180);

        // Create a rectangle representing the map bounds
        const rect = new MaplibreRectangle([[min_lon, min_lat], [max_lon, max_lat]]);

        // Update the filter's bounding box field with the WKT representation of the rectangle
        this.options.filter.bboxfield.value = rect.getWKT();
    }

    _formClear(form) {
        // Select all input elements of type text, password, file, number, and all select and textarea elements
        const elements = form.querySelectorAll('input[type="text"], input[type="password"], input[type="file"], input[type="number"], select, textarea');
        elements.forEach(el => {
            el.value = '';
            el.dispatchEvent(new Event('change'));
        });

        // Select all input elements of type radio and checkbox, and all select options
        const radioCheckboxElements = form.querySelectorAll('input[type="radio"], input[type="checkbox"], select option');
        radioCheckboxElements.forEach(el => {
            el.removeAttribute('checked');
            el.removeAttribute('selected');
        });

        // Update chosen selects
        const selectElements = form.querySelectorAll('select');
        selectElements.forEach(select => {
            select.value = '';
            select.dispatchEvent(new Event('chosen:updated'));
        });
    }

    __initSelectorOnce() {
        const self = this;
        const selectorOnce = (() => {
            let current = { 'pk': null, 'row': null }; // Store the currently selected row and object

            // Function to handle the animation of selecting/deselecting rows
            const toggleSelectRow = ($prevRow, $nextRow) => {
                const nextRowAnim = () => {
                    if ($nextRow) {
                        $nextRow.style.display = 'none';
                        setTimeout(() => {
                            $nextRow.style.display = '';
                            $nextRow.classList.add('success');
                        }, 100);
                    }
                };

                if ($prevRow) {
                    $prevRow.style.display = 'none';
                    setTimeout(() => {
                        $prevRow.style.display = '';
                        $prevRow.classList.remove('success');
                        nextRowAnim();
                    }, 100);
                } else {
                    nextRowAnim();
                }
            };

            // Function to handle the selection/deselection of an object on the map
            const toggleSelectObject = (pk, on = true) => {
                self.layer.select(pk, on);
            };

            return {
                // Main function to select/deselect a row and an object
                'select': (pk, row) => {
                    // If clicking on an already selected row, deselect it
                    if (pk === current.pk) {
                        pk = null;
                        row = null;
                    }

                    const prev = current; // Save the previous selection
                    current = { 'pk': pk, 'row': row }; // Update the current selection

                    toggleSelectRow(prev.row, row); // Update the row animation

                    if (prev.pk && prev.row) {
                        toggleSelectObject(prev.pk, false); // Deselect the previous object
                    }
                    if (row && pk) {
                        toggleSelectObject(pk, true); // Select the new object
                    }
                }
            };
        })();
        return selectorOnce; // Return the `selectorOnce` object for later use
    }
}
