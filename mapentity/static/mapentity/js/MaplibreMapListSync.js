class MaplibreMapListSync {
    constructor(datatable, map, objectsLayer, togglableFiltre, history, bounds) {
        this.dt = datatable;
        this.map = map;
        this.layer = objectsLayer;
        this.togglableFiltre = togglableFiltre; // Initialize the filter
        this.history = history;
        this.bounds = bounds;
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

        this.map.onMoveEnd = (e) => this._onMapViewChanged(e);

        if (this.options.filter) {
            this.options.filter.submitbutton.addEventListener('click', (e) => this._onFormSubmit(e));
            this.options.filter.resetbutton.addEventListener('click', (e) => this._onFormReset(e));
        }

        this.dt.onFilter = () => this._onListFilter();
    }

    _onListFilter() {
        // Retrieve the value of the filter text input in DataTables
        // const filterTxt = document.querySelector(".dataTables_filter input[type='text']").value;
        // Get the data from the first column of the table
        const results = this.dt.column(0).data().toArray();

        console.log('results _onListFilter : ', results);
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
            document.getElementById('filters-btn').classList.remove('btn-info'); // peut être remplacé par toggleable.button.ClassList.remove('btn-info'); idem pour les autres.
            document.getElementById('filters-btn').classList.add('btn-warning');
        } else {
            document.getElementById('filters-btn').classList.remove('btn-warning');
            document.getElementById('filters-btn').classList.add('btn-info');
        }

        // Update the datatables URL with the filter parameters
        const url = `${this.options.filter.form.getAttribute('action')}?${new URLSearchParams(formData).toString()}`;
        this.dt.ajax.url(url).load();

        if (this._loading) return;
        this._loading = true;

        // this.spinner.show(); // Show the spinner

        try {
            // Get filtered primary keys (PKs)
            const response = await fetch(`${this.options.filter.form.getAttribute('action').replace('.datatables', '/filter_infos.json')}?${new URLSearchParams(formData)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('filter_infos', data);

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

        // Clamp latitude and longitude values to valid ranges
        const min_lon = Math.max(this.bounds[0][0], -180);
        const min_lat = Math.max(this.bounds[0][1], -90);
        const max_lon = Math.min(this.bounds[1][0], 180);
        const max_lat = Math.min(this.bounds[1][1], 90);

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
            el.dispatchEvent(new Event('change')); // je ne sais pas si c'est custom ou pas mais j'ai l'impression que c'est custom
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
            select.dispatchEvent(new Event('chosen:updated')); // chosen est une bibliothèque JS pour les sélecteurs, pas possible de l'enlever
        });
    }
}
