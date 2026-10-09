class MaplibreMapListSync {
    /**
     * MaplibreMapListSync Constructor
     * @param datatable {DataTable} - The DataTable instance to synchronize with the MapLibre map
     * @param map {maplibregl.Map} - The MapLibre map instance to synchronize with the list
     * @param objectsLayer {MaplibreObjectsLayer} - The MaplibreObjectsLayer instance to manage map objects
     * @param togglableFilter {MaplibreMapentityTogglableFilter} - The MaplibreMapentityTogglableFilter instance to manage filters
     * @param history {MaplibreMapentityHistory} - The MaplibreMapentityHistory instance to manage action history
     */
    constructor(datatable, map, objectsLayer, togglableFilter, history) {
        this.dt = datatable;
        this.map = map;
        this.layer = objectsLayer;
        this.togglableFilter = togglableFilter;
        this.history = history;
        this.options = {
            filter: {
                form: document.getElementById('mainfilter'),
                submitbutton: document.getElementById('filter'),
                resetbutton: document.getElementById('reset'),
                bboxfield: document.getElementById('id_bbox'),
            }
        };

        this._loading = false;

        this.initialize();
    }

    /**
     * MaplibreMapListSync Initialization
     */
     initialize() {

        this.map.on('moveend', (e) => this._onMapViewChanged(e));

        if (this.options.filter) {
            this.options.filter.submitbutton.addEventListener('click', (e) => this._onFormSubmit(e));
            this.options.filter.resetbutton.addEventListener('click', (e) => this._onFormReset(e));
        }

        this.dt.onFilter = () => this._onListFilter();
    }

    /**
     * Callback for list filtering
     * @private
     */
    _onListFilter() {
        const results = this.dt.column(0).data().toArray();
        // In MVT mode, filtering is managed by _reloadList via filter_infos
        // which returns all filtered PKs, not just those of the current page
        if (!this.layer._isMVT) {
            this.layer.updateFromPks(results);
        }
        this._handleReloaded(results.length);
    }

    /**
     * Ensures that the history is updated with the number of reloaded records
     * @param nbrecords {number} - The number of reloaded records
     * @private
     */
    _handleReloaded(nbrecords) {
            this.history.saveListInfo({ model: this.options.modelname, nb: nbrecords });
            this.togglableFilter.setsubmit();
    }

    /**
     * Callback for map view changes
     * @param e {Object} - The map view change event
     * @private
     */
    _onMapViewChanged(e) {
        if (!this.map || !this.map.loaded()) {
            setTimeout(() => this._onMapViewChanged(e), 20);
            return;
        }
        const mapViewChangedStatue = true
        this._formSetBounds();
        this._reloadList(mapViewChangedStatue);
    }

    /**
     * Callback for filter form submission
     * @param e {Event} - The form submission event
     * @private
     */
    _onFormSubmit(e) {
        this._formSetBounds();
        this._reloadList(true);
    }

    /**
     * Callback for filter form reset
     * @param e {Event} - The form reset event
     * @private
     */
    _onFormReset(e) {
        this._formClear(this.options.filter.form);
        this._reloadList();
        this._formSetBounds();
    }

    /**
     * Refreshes the list of entities displayed on the map
     * @param mapViewChangedStatue {boolean} - Indicates if the map view has changed
     * @returns {Promise<boolean>} - Returns a promise that resolves to false if loading is finished
     * @private
     */
    async _reloadList(mapViewChangedStatue = false) {
        const formData = new FormData(this.options.filter.form);
        let filter = false;

        for (const [key, value] of formData.entries()) {
            if (key !== 'bbox' && value !== '') {
                filter = true;
            }
        }

        if(!mapViewChangedStatue) {
            this.togglableFilter.button.classList.toggle('btn-info', !filter);
            this.togglableFilter.button.classList.toggle('btn-warning', filter);
        }


        // Update the DataTable URL with the form parameters
        const url = `${this.options.filter.form.getAttribute('action')}?${new URLSearchParams(formData).toString()}`;
        this.dt.ajax.url(url).load();

        if (this._loading) {
            return;
        }
        this._loading = true;

        try {
            const response = await fetch(`${this.options.filter.form.getAttribute('action').replace('.datatables', '/filter_infos.json')}?${new URLSearchParams(formData)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            document.getElementById('nbresults').textContent = data.count;

            this.layer.updateFromPks(data.pk_list);

        } catch (error) {
            console.error('Error:', error);
        } finally {
            this._loading = false;
        }
    }

    /**
     * Updates the filter form boundaries based on the current map view
     * @private
     */
    _formSetBounds() {
        if (!this.options.filter) {
            return;
        }

        if (!this.map.loaded()) {
            console.warn("Map view not set, cannot get bounds.");
            return;
        }

        const bounds = this.map.getBounds(); // The bounds used must be the one studied on the map because it is dynamic.

        // Extract coordinates and clip them to valid values
        const min_lon = Math.max(bounds.getWest(), -180);
        const min_lat = Math.max(bounds.getSouth(), -90);
        const max_lon = Math.min(bounds.getEast(), 180);
        const max_lat = Math.min(bounds.getNorth(), 90);

        // Create a MaplibreRectangle from these coordinates
        const rect = new MaplibreRectangle([[min_lon, min_lat], [max_lon, max_lat]]);

        // Check that bboxfield exists before accessing it
        if (this.options.filter && this.options.filter.bboxfield) {
            // Update the filter's bbox field with the rectangle's WKT
            this.options.filter.bboxfield.value = rect.getWKT();
        }
    }

    /**
     * Clear the filter form fields
     * @param form {HTMLFormElement} - The form to clear
     * @private
     */
    _formClear(form) {
        // selection of text input fields, password, file, number, selectors, and text areas
        const elements = form.querySelectorAll('input[type="text"], input[type="password"], input[type="file"], input[type="number"], select, textarea');
        elements.forEach(el => {
            el.value = '';
            el.dispatchEvent(new Event('change'));
        });

        // Selecting radio button, checkbox, and select option inputs
        const radioCheckboxElements = form.querySelectorAll('input[type="radio"], input[type="checkbox"], select option');
        radioCheckboxElements.forEach(el => {
            el.removeAttribute('checked');
            el.removeAttribute('selected');
        });

        const selectElements = form.querySelectorAll('select');
        selectElements.forEach(select => {
            select.value = '';
            select.dispatchEvent(new Event('change'));
        });
    }
}
