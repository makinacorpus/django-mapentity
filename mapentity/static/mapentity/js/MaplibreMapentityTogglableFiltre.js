class MaplibreMapentityTogglableFiltre {
    constructor() {
        this.button = document.getElementById('filters-btn');
        this.fields = {};
        this.visible = false;
        this.loaded_form = false;
        this.popover = document.getElementById('filters-popover');
        this.hover = document.getElementById('filters-hover');
        this.isOutsideClickHandlerAttached = false;

        // this.button.addEventListener('mouseenter', () => this.showinfo());
        // this.button.addEventListener('mouseleave', () => this.hideinfo());

        document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });

        document.getElementById('filters-close').addEventListener('click', () => this.close());

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
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
                if (!response.ok) throw new Error('Network response was not ok');

                const responseText = await response.text();
                document.querySelector('#filters-panel .filter-spinner-container').style.display = 'none';

                mainfilter.outerHTML = responseText;
                const newMainFilter = document.getElementById('mainfilter');

                mapsync.options.filter.form = newMainFilter;

                document.getElementById('filter').addEventListener('click', (e) => mapsync._onFormSubmit(e));
                document.getElementById('reset').addEventListener('click', (e) => mapsync._onFormReset(e));

                document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
                    element.addEventListener('change', () => this.setfield(element));
                });

                newMainFilter.addEventListener('reset', () => {
                    setTimeout(() => {
                        newMainFilter.querySelectorAll('select[multiple]').forEach(select => {
                            select.dispatchEvent(new Event('chosen:updated'));
                        });
                    }, 1);
                });

                newMainFilter.querySelectorAll('select[multiple]').forEach(select => {
                    select.addEventListener('change', (e) => {
                        const name = e.target.getAttribute('name');
                        const container = document.querySelector(`div#id_${name}_chzn > ul`);
                        const hasSelectedOption = Array.from(e.target.options).some(option => option.selected);
                        container.classList.toggle('filter-set', hasSelectedOption);
                    });
                });

                newMainFilter.querySelectorAll('.right-filter').forEach(filter => {
                    filter.remove();
                    document.querySelector('#mainfilter > .right').appendChild(filter);
                });

                const context = document.body.dataset;
                window.dispatchEvent(new CustomEvent('entity:view:filter', { detail: { modelname: context.modelname } }));
                this.loaded_form = true;

            } catch (error) {
                console.error('Error loading filter form:', error);
            }
        }
    }

    handleOutsideClick = (e) => {
        if (!this.tip().contains(e.target) && !this.button.contains(e.target)) {
            this.close();
        }
    }

    showinfo = () => {
        if (this.visible) return;
        this.hover.innerHTML = this.infos();
        this.hover.style.display = 'block';
    }

    hideinfo = () => {
        this.hover.style.display = 'none';
    }

    infos = () => {
        if (Object.keys(this.fields).length === 0) {
            return "<p>No filter</p>";
        }

        const p = '<p><span class="filter-info">%name%</span>: %value%</p>';
        return Object.values(this.fields).map(f => {
            let value = f.value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
            return p.replace('%name%', f.label).replace('%value%', value);
        }).join('');
    }

    toggle = () => {
        this.visible ? this.close() : this.open();
    }

    open = () => {
        if (this.visible) return;

        this.hideinfo();
        this.tip().innerHTML = '<div class="arrow"/>';
        this.tip().appendChild(document.querySelector('#filters-wrapper #filters-panel'));

        this.tip().style.display = 'block';
        this.tip().style.width = `${this.tip().querySelector('#filters-panel form').offsetWidth}px`;
        this.visible = true;

        if (!this.isOutsideClickHandlerAttached) {
            document.addEventListener('click', this.handleOutsideClick);
            this.isOutsideClickHandlerAttached = true;
        }
    }

    close = () => {
        if (!this.visible) return;

        const panel = this.tip().querySelector('#filters-panel');
        if (panel) {
            document.getElementById('filters-wrapper').appendChild(panel);
        }

        this.tip().style.display = 'none';
        this.visible = false;

        if (this.isOutsideClickHandlerAttached) {
            document.removeEventListener('click', this.handleOutsideClick);
            this.isOutsideClickHandlerAttached = false;
        }
    }

    setfield = (field) => {
        const label = field.dataset.label;
        const name = field.getAttribute('name');
        let val = field.value;
        let set = val !== '' && val != [''];

        if (field.tagName === 'INPUT' && field.type === 'hidden') {
            set = false;
        } else if (field.tagName === 'SELECT' && field.multiple) {
            set = Array.from(field.options).some(option => option.selected);
        } else if (field.tagName === 'SELECT') {
            set = val !== field.querySelector('option')?.value;
        }

        let value = val;
        if (field.tagName === 'SELECT') {
            value = Array.from(field.options)
                .filter(option => option.selected)
                .map(option => option.textContent)
                .join(', ');
        }

        if (set) {
            this.fields[name] = { name: name, val: val, value: value, label: label };
            field.classList.add('filter-set');
        } else {
            delete this.fields[name];
            field.classList.remove('filter-set');
        }

        this.setsubmit();
        return set;
    }

    setsubmit = () => {
        if (Object.keys(this.fields).length === 0) {
            this.button.classList.add('btn-info');
            this.button.classList.remove('btn-warning');
        } else {
            this.button.classList.remove('btn-info');
            this.button.classList.add('btn-warning');
        }
    }
}
