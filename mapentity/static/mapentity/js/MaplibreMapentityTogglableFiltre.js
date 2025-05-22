class MaplibreMapentityTogglableFiltre {
    constructor() {
        this.button = document.getElementById('filters-btn');
        this.fields = {};
        this.visible = false; // erreur sur la gestion de la visibilité
        this.loaded_form = false;
        this.popover = document.getElementById('filters-popover');
        this.hover = document.getElementById('filters-hover');

        this.button.addEventListener('mouseenter', () => this.showinfo());
        this.button.addEventListener('mouseleave', () => this.hideinfo());

        document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });

        // Close button
        document.getElementById('filters-close').addEventListener('click', () => this.toggle());

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();

            // Open/Close from button
            this.toggle();

            // Close when click outside
            if (this.visible) {
                document.addEventListener('click', this.handleOutsideClick);
            }
        });
    }

    tip() {
        return this.popover;
    }

    async load_filter_form(mapsync) {
        const mainfilter = document.getElementById('mainfilter');
        if (!this.loaded_form) {
            const filterUrl = mainfilter.getAttribute('filter-url');
            try {
                const response = await fetch(filterUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const responseText = await response.text();

                document.querySelector('#filters-panel .filter-spinner-container').style.display = 'none';

                // Replace simple form that contains only BBOX with full form, including attributes
                mainfilter.outerHTML = responseText;
                const newMainFilter = document.getElementById('mainfilter');

                // Update L.MapListSync to refresh datatable on change
                mapsync.options.filter.form = newMainFilter;

                // Bind new form buttons to keep refreshing list on click
                document.getElementById('filter').addEventListener('click', (e) => mapsync._onFormSubmit(e));
                document.getElementById('reset').addEventListener('click', (e) => mapsync._onFormReset(e));

                // Bind setfields to update list of enabled fields displayed on hover
                document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
                    element.addEventListener('change', () => this.setfield(element));
                });
                this.loaded_form = true;

                // Use chosen for multiple values
                newMainFilter.addEventListener('reset', () => {
                    setTimeout(() => {
                        newMainFilter.querySelectorAll('select[multiple]').forEach(select => {
                            select.dispatchEvent(new Event('chosen:updated'));
                        });
                    }, 1);
                });

                // Make sure filter-set class is added if a choice is selected.
                newMainFilter.querySelectorAll('select[multiple]').forEach(select => {
                    select.addEventListener('change', (e) => {
                        const target = e.target;
                        const name = target.getAttribute('name');
                        const container = document.querySelector(`div#id_${name}_chzn > ul`);
                        const hasSelectedOption = target.querySelectorAll('option:selected').length > 0;
                        container.classList.toggle('filter-set', hasSelectedOption);
                    });
                });
                // Move right-filters to right side
                newMainFilter.querySelectorAll('.right-filter').forEach(filter => {
                    filter.parentNode.remove();
                    document.querySelector('#mainfilter > .right').appendChild(filter);
                });
                // Trigger event allowing to launch further processing
                const context = document.body.dataset;
                console.log('context : ', JSON.stringify(context));
                window.dispatchEvent(new CustomEvent('entity:view:filter', { detail: { modelname: context.modelname } }));
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }

    handleOutsideClick = (e) => {
        if (!this.tip().contains(e.target) && !this.button.contains(e.target)) {
            this.toggle();
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    showinfo = () => {
        // If popover is already visible, do not show hover
        if (this.visible) return;
        this.hover.innerHTML = this.infos(); // Set the hover content using the infos method
        this.hover.style.display = 'block';
    }

    hideinfo = () => {
        this.hover.style.display = 'none';
    }

    infos = () => {
        if (Object.keys(this.fields).length === 0) {
            return "<p>No filter</p>";
        }
        // We do not use handlebars just for this. If more to come, we will !
        let p = '<p><span class="filter-info">%name%</span>: %value%</p>';
        let i = '';
        for (const k in this.fields) {
            const f = this.fields[k];
            let value = f.value;
            value = value.replace(/&/g, '&amp;');
            value = value.replace(/</g, '&lt;');
            value = value.replace(/>/g, '&gt;');
            value = value.replace(/"/g, '&quot;');
            value = value.replace(/'/g, '&#x27;');
            i += p.replace('%name%', f.label).replace('%value%', value);
        }
        return i;
    }

    toggle = () => {
        console.log('Toggle filter popover');
        console.log('this.popover', this.visible);
        /* Show/Hide popover */
        if (this.visible) {
            // The whole $tip will be deleted, save the panel
            // and add it to the DOM so the dynamic filters still works.
            document.getElementById('filters-wrapper').appendChild( // erreur ici
                this.tip().querySelector('#filters-panel')
            );
        }

        this.popover.style.display = this.popover.style.display === 'none' ? 'block' : 'none';
        this.visible = !this.visible;

        if (this.visible) {
            this.hideinfo();
            this.tip().innerHTML = '<div class="arrow"/>';
            this.tip().appendChild(document.querySelector('#filters-wrapper #filters-panel'));

            // Adjust popover width
            this.tip().style.width = `${this.tip().querySelector('#filters-panel form').offsetWidth}px`;
        }
    }

    setfield = (field) => {
        const label = field.dataset.label;
        const name = field.getAttribute('name');
        let val = field.value;
        let set = val !== '' && val != [''];

        // Consider a value set if it is not the first option selected
        if (field.tagName === 'INPUT' && field.type === 'hidden') {
            set = false;
        } else if (field.tagName === 'SELECT' && field.multiple) {
            set = val !== null;
        } else if (field.tagName === 'SELECT') {
            set = val !== field.querySelector('option').value;
        }

        // Displayed value
        let value = val;
        if (field.tagName === 'SELECT') {
            value = Array.from(field.querySelectorAll('option:selected')).map(node => node.textContent).join(', ');
        }
        if (set) {
            this.fields[name] = { name: name, val: val, value: value, label: label };
        } else {
            delete this.fields[name];
        }

        if (set) {
            field.classList.add('filter-set');
        } else {
            field.classList.remove('filter-set');
        }
        return set;
    }

    setsubmit = () => {
        // this.submitted = true;
        // Show fields as bold
        // Show button as active
        if (Object.keys(this.fields).length === 0) {
            this.button.classList.add('btn-info');
            this.button.classList.remove('btn-warning');
        } else {
            this.button.classList.remove('btn-info');
            this.button.classList.add('btn-warning');
        }
    }
}
