class MaplibreMapentityTogglableFilter {
    constructor() {
        this.button = document.getElementById('filters-btn');
        this.button.setAttribute('type', 'button');
        this.fields = {};
        this.visible = false;
        this.loaded_form = false;

        if (!this.button) {
            console.error('Required button element not found');
            return;
        }

        this.initPopover();
        this.initEventListeners();
    }

    initPopover() {
        if (typeof $ === 'undefined') {
            console.error('jQuery not available for popover');
            return;
        }

        const popoverEl = document.getElementById('filters-popover');
        const hoverEl = document.getElementById('filters-hover');

        if (!popoverEl || !hoverEl) {
            console.error('Popover elements not found');
            return;
        }

        this.popover = $('#filters-popover').popover({
            placement: 'bottom',
            html: true,
            content: '',
            title: 'useless',
        });

        this.hover = $('#filters-hover').popover({
            placement: 'bottom',
            html: true,
            content: () => this.infos(),
            title: tr("Current criteria"),
        });
    }

    /**
     * Initialize event listeners for buttons and fields
     */
    initEventListeners() {
        this.button.addEventListener('mouseenter', () => this.showinfo());
        this.button.addEventListener('mouseleave', () => this.hideinfo());

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        const closeBtn = document.getElementById('filters-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggle());
        }

        this.attachFieldEvents();
    }

    /**
     * Attach events to filter form fields
     */
    attachFieldEvents() {
        document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });
    }

    /**
     *  Accessor to get the popover's tip element
     * @returns {jQuery|HTMLElement|*|null}
     */
    tip() {
        try {
            if (this.popover && this.popover.length > 0) {
                const popoverData = this.popover.data('bs.popover');
                if (popoverData && popoverData.tip) {
                    return $(popoverData.tip);
                }
            }
        } catch (error) {
            console.error('Error getting popover tip:', error);
        }
        return null;
    }

    /**
     * Loads the filter form from the URL specified in the filter-url attribute
     * @param mapsync {MaplibreMapListSync} - Instance of MaplibreMapListSync for filter synchronization
     * @param callback {Function} - Function to execute when filters are loaded
     * @returns {Promise<void>} - Returns a promise that resolves when the form is loaded
     */
    async load_filter_form(mapsync, callback) {
        const mainfilter = document.getElementById('mainfilter');
        if (!mainfilter || this.loaded_form) {
            return;
        }

        const filterUrl = mainfilter.getAttribute('filter-url');
        if (!filterUrl) {
            console.error('Filter URL not found');
            return;
        }

        try {
            const response = await fetch(filterUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();

            const spinner = document.querySelector('#filters-panel .filter-spinner-container');
            if (spinner) {
                spinner.style.display = 'none';
            }

            mainfilter.outerHTML = responseText;
            const newMainFilter = document.getElementById('mainfilter');

            if (!newMainFilter) {
                throw new Error('New main filter not found after replacement');
            }

            if (mapsync?.options?.filter) {
                mapsync.options.filter.form = newMainFilter;
            }

            // Attach events to buttons
            this._attachFormEvents(mapsync, newMainFilter);

            // Managing Multiple Selects with Chosen
            this._setupSelects(newMainFilter);

            // Rearrange the right filters
            this._reorganizeRightFilters(newMainFilter);

            // Dispatch custom event
            this._dispatchFilterEvent();

            this.loaded_form = true;

            if (callback){
                await callback.apply();
            }

            // Force Select2 initialization on autocomplete fields
            $('#mainfilter select').select2({allowClear: true, theme: 'bootstrap4'});

        } catch (error) {
            console.error('Error loading filter form:', error);
            this.showError('Error loading filter form');
        }
    }

    /**
     * Attach events to filter form buttons and fields
     * @param mapsync {MaplibreMapListSync} - Instance of MaplibreMapListSync for filter synchronization
     * @param newMainFilter {HTMLElement} - The new main filter element
     * @private
     */
    _attachFormEvents(mapsync, newMainFilter) {
        const filterBtn = document.getElementById('filter');
        const resetBtn = document.getElementById('reset');

        if (filterBtn && mapsync?._onFormSubmit) {
            filterBtn.addEventListener('click', (e) => mapsync._onFormSubmit(e));
        }

        if (resetBtn && mapsync?._onFormReset) {
            resetBtn.addEventListener('click', (e) => mapsync._onFormReset(e));
        }

        newMainFilter.querySelectorAll('select, input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });
    }

    /**
     * Configure multiple selects
     * @param newMainFilter {HTMLElement} - The new main filter element
     * @private
     */
    _setupSelects(newMainFilter) {

        const multipleSelects = newMainFilter.querySelectorAll('select[multiple]');

        multipleSelects.forEach(select => {
            // Event listener for the filter-set class
            select.addEventListener('change', (e) => {
                const name = e.target.getAttribute('name');
                const container = document.querySelector(`div#id_${name}_chzn > ul`);
                const hasSelectedOption = Array.from(e.target.options).some(option => option.selected);

                if (container) {
                    container.classList.toggle('filter-set', hasSelectedOption);
                }
            });
        });
    }

    /**
     * Reorganizes the right filters in the main container
     * @param newMainFilter {HTMLElement} - The new main filter element
     * @private
     */
    _reorganizeRightFilters(newMainFilter) {
        const rightContainer = document.querySelector('#mainfilter > .right');
        if (!rightContainer) {
            return;
        }

        newMainFilter.querySelectorAll('.right-filter').forEach(filter => {
            const p = filter.closest('p');
            if (p) {
                rightContainer.appendChild(p);
            }
        });
    }

    /**
     * Triggers a custom event for filters
     * @private
     */
    _dispatchFilterEvent() {
        const context = document.body.dataset;
        if (context?.modelname) {
            window.dispatchEvent(new CustomEvent('entity:view:filter', {
                detail: { modelname: context.modelname }
            }));
        }
    }

    /**
     * Display an error message in the console
     * @param message
     */
    showError(message) {
        console.error(message);
    }

    /**
     * Display the information popover (hover) if the main popover is not visible
     */
    showinfo() {

        if (this.visible) {
            return;
        }

        if (!this.hover) {
            console.warn('Hover popover not initialized');
            return;
        }

        try {
            this.hover.popover('show');
        } catch (error) {
            console.error('Error showing info popover:', error);
        }
    }

    /**
     * Hide the information popover (hover) if it is visible
     */
    hideinfo() {
        if (this.hover) {
            try {
                this.hover.popover('hide');
            } catch (error) {
                console.error('Error hiding info popover:', error);
            }
        }
    }

    /**
     * Display active filter information
     * @returns {string}
     */
    infos() {
        if (Object.keys(this.fields).length === 0) {
            return "<p>" + tr("No filter") + "</p>";
        }

        return Object.values(this.fields).map(f => {
            const safeValue = this._escapeHtml(f.value);
            const safeLabel = this._escapeHtml(f.label);
            return `<p><span class="filter-info">${safeLabel}</span>: ${safeValue}</p>`;
        }).join('');
    }

    /**
     * Escape HTML special characters in a string
     * @param str {string|null|undefined} - The string to escape
     * @returns {string} - The escaped string
     * @private
     */
    _escapeHtml(str) {
        if (str === null || str === undefined) return '';

        return String(str).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        }[char]));
    }

    /**
     * Flip the filter popover display
     */
    toggle() {
        if (!this.popover) {
            console.warn('Popover not initialized');
            return;
        }

        if (this.visible) {
            this._hidePopover();
        } else {
            this._showPopover();
        }

        this.visible = !this.visible;
    }

    /**
     * Show filter popover
     * @private
     */
    _showPopover() {

        this.hideinfo();

        if (!this.popover) {
            console.error('Popover not initialized');
            return;
        }

        try {
            this.popover.popover('show');

            setTimeout(() => {
                const tip = this.tip();
                if (tip && tip.length > 0) {
                    this.setupPopoverContent();
                    this.attachOutsideClickListener();
                } else {
                    console.error('Popover tip still not found after show');
                }
            }, 100);

        } catch (error) {
            console.error('Error showing popover:', error);
        }
    }

    /**
     * Hide filter popover
     * @private
     */
    _hidePopover() {
        const tip = this.tip();

        if (tip && tip.length > 0) {
            const panel = tip.find('#filters-panel');
            const wrapper = document.getElementById('filters-wrapper');
            if (panel.length > 0 && wrapper) {
                wrapper.appendChild(panel[0]);
            }
        }

        try {
            this.popover.popover('hide');
        } catch (error) {
            console.error('Error hiding popover:', error);
        }

        this.removeOutsideClickListener();
    }

    setupPopoverContent() {
        const tip = this.tip();
        if (!tip || tip.length === 0) {
            console.warn('Popover tip not found for setup');
            return;
        }

        try {
            tip.empty().append('<div class="arrow"/>');

            // Move the wrapper panel to the tip
            const panel = $('#filters-wrapper #filters-panel');
            if (panel.length > 0) {
                tip.append(panel.detach());

                // Adjust width based on form
                const form = panel.find('form');
                if (form.length > 0) {
                    const formWidth = form.outerWidth();
                    tip.width(formWidth);
                }
            } else {
                console.warn('Filters panel not found in wrapper');
            }
        } catch (error) {
            console.error('Error setting up popover content:', error);
        }
    }

    /**
     * Attach an event listener for clicks outside the popover
     */
    attachOutsideClickListener() {

        $(document).on('click.filtersOutside', (e) => {
            const tip = this.tip();
            const target = e.target;

            if (!tip || tip.length === 0) return;

            const isOutsideTip = tip.has(target).length === 0;
            const isOutsideButton = !this.button.contains(target);

            if (isOutsideTip && isOutsideButton) {
                this.toggle();
            }
        });
    }

    /**
     * Remove event listener for clicks outside the popover
     */
    removeOutsideClickListener() {
        $(document).off('click.filtersOutside');
    }

    /**
     * Updates the state of a filter field
     * @param field {HTMLElement} - The field element to update
     * @returns {boolean} - Returns true if the field is set, false otherwise
     */
    setfield(field) {
        if (!field || !field.name) return false;

        const $field = $(field);
        const name = field.name;
        const label = $field.data('label') || name;
        let val = $field.val();
        let set = val !== '' && val !== null && !Array.isArray(val) || (Array.isArray(val) && val.length > 0 && val[0] !== '');

        // Logic for different field types
        if ($field.is('input[type=hidden]')) {
            set = false;
        } else if ($field.is('select[multiple]')) {
            set = val !== null && val.length > 0;
        } else if ($field.is('select')) {
            const firstOptionVal = $field.find('option').first().val();
            set = val !== firstOptionVal;
        }

        // Determine the display value
        let value = val;
        if (field.tagName === 'SELECT') {
            value = $field.find('option:selected').toArray()
                .map(option => $(option).text())
                .join(', ');
        }

        // Update fields and classes
        if (set) {
            this.fields[name] = { name, val, value, label };
            $field.addClass('filter-set');
        } else {
            delete this.fields[name];
            $field.removeClass('filter-set');
        }

        this.setsubmit();
        return set;
    }

    /**
     * Updates the submit button state based on active filters
     */
    setsubmit() {
        const btn = document.getElementById('filters-btn');
        if (!btn) return;

        const hasFilters = Object.keys(this.fields).length > 0;

        if (hasFilters) {
            btn.classList.remove('btn-info');
            btn.classList.add('btn-warning');
        } else {
            btn.classList.add('btn-info');
            btn.classList.remove('btn-warning');
        }
    }
}