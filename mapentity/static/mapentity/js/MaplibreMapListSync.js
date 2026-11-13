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
            this.options.filter.submitbutton?.addEventListener('click', (e) => this._onFormSubmit(e));
            this.options.filter.resetbutton?.addEventListener('click', (e) => this._onFormReset(e));
        }

        this.dt.onFilter = () => this._onListFilter();

        this._formSetBounds();
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
        if (!this.map) {
            return;
        }
        const mapViewChangedStatue = true;
        this._formSetBounds();
        this._reloadList(mapViewChangedStatue);
    }

    /**
     * Callback for filter form submission
     * @param e {Event} - The form submission event
     * @private
     */
    _onFormSubmit(e) {
        if (e) {
            e.preventDefault();
        }
        const form = document.getElementById('mainfilter') || this.options.filter?.form;
        if (form && this.togglableFilter) {
            form.querySelectorAll('select, input').forEach(element => {
                this.togglableFilter.setfield(element);
            });
            this.togglableFilter.setsubmit();
        }
        this._formSetBounds();
        this._reloadList();
    }

    /**
     * Callback for filter form reset
     * @param e {Event} - The form reset event
     * @private
     */
    _onFormReset(e) {
        const form = document.getElementById('mainfilter') || this.options.filter?.form;
        this._formClear(form);
        this._formSetBounds();
        this._reloadList();
        if (this.togglableFilter) {
            this.togglableFilter.fields = {};
            this.togglableFilter.setsubmit();
        }
    }

    /**
     * Refreshes the list of entities displayed on the map
     * @param mapViewChangedStatue {boolean} - Indicates if the map view has changed
     * @returns {Promise<boolean>} - Returns a promise that resolves to false if loading is finished
     * @private
     */
    async _reloadList(mapViewChangedStatue = false) {
        const form = document.getElementById('mainfilter') || this.options.filter?.form;
        if (!form) {
            return;
        }
        const formData = new FormData(form);
        let filter = false;

        for (const [key, value] of formData.entries()) {
            if (key !== 'bbox' && value !== '') {
                filter = true;
            }
        }

        if (this.togglableFilter?.button) {
            this.togglableFilter.button.classList.toggle('btn-info', !filter);
            this.togglableFilter.button.classList.toggle('btn-warning', filter);
        }

        // Update the DataTable URL with the form parameters
        const url = `${form.getAttribute('action')}?${new URLSearchParams(formData).toString()}`;
        this.dt.ajax.url(url).load();

        if (this._abortController) {
            this._abortController.abort();
        }
        this._abortController = new AbortController();

        try {
            const filterInfosUrl = `${form.getAttribute('action').replace('.datatables', '/filter_infos.json')}?${new URLSearchParams(formData)}`;
            const response = await fetch(filterInfosUrl, { signal: this._abortController.signal });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            const countEl = document.getElementById('nbresults');
            if (countEl) {
                countEl.textContent = data.count;
            }

            this.layer.updateFromPks(data.pk_list);

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching filter_infos:', error);
            }
        }
    }

    /**
     * Updates references to filter form elements when the form HTML is replaced
     * @param form {HTMLFormElement} - The new main filter form element
     */
    updateFilterElements(form) {
        const newForm = form || document.getElementById('mainfilter');
        const submitBtn = document.getElementById('filter');
        const resetBtn = document.getElementById('reset');
        const bboxField = newForm ? newForm.querySelector('#id_bbox') : document.getElementById('id_bbox');

        this.options.filter = {
            form: newForm,
            submitbutton: submitBtn,
            resetbutton: resetBtn,
            bboxfield: bboxField
        };

        this._formSetBounds();
    }

    /**
     * Updates the filter form boundaries based on the current map view
     * @private
     */
    _formSetBounds() {
        if (!this.map) {
            return;
        }

        const form = document.getElementById('mainfilter') || this.options.filter?.form;
        const bboxField = form ? form.querySelector('#id_bbox') : document.getElementById('id_bbox');
        if (!bboxField) {
            return;
        }

        const bounds = this.map.getBounds ? this.map.getBounds() : null;
        if (!bounds) {
            return;
        }

        // Extract coordinates and clip them to valid values
        const min_lon = Math.max(bounds.getWest(), -180);
        const min_lat = Math.max(bounds.getSouth(), -90);
        const max_lon = Math.min(bounds.getEast(), 180);
        const max_lat = Math.min(bounds.getNorth(), 90);

        if (!Number.isFinite(min_lon) || !Number.isFinite(min_lat) || !Number.isFinite(max_lon) || !Number.isFinite(max_lat)) {
            return;
        }

        // Create a MaplibreRectangle from these coordinates
        const rect = new MaplibreRectangle([[min_lon, min_lat], [max_lon, max_lat]]);

        bboxField.value = rect.getWKT();
        if (this.options.filter) {
            this.options.filter.bboxfield = bboxField;
            if (form) {
                this.options.filter.form = form;
            }
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
            Array.from(select.options).forEach(opt => {
                opt.selected = false;
            });
            select.value = '';
            select.dispatchEvent(new Event('change'));
            if (typeof $ !== 'undefined') {
                $(select).val(null).trigger('change');
            }
        });
    }
}
