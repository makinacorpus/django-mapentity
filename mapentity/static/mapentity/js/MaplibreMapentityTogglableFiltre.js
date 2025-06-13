class MaplibreMapentityTogglableFiltre {
    constructor() {
        this.button = document.getElementById('filters-btn');
        this.button.setAttribute('type', 'button');
        this.fields = {};
        this.visible = false;
        this.loaded_form = false;

        // Vérification que les éléments existent
        if (!this.button) {
            console.error('Required button element not found');
            return;
        }

        this.initPopover();
        this.initEventListeners();
    }

    initPopover() {
        // Vérifier que jQuery et Bootstrap sont disponibles
        if (typeof $ === 'undefined') {
            console.error('jQuery not available for popover');
            return;
        }

        // Vérifier que les éléments existent
        const popoverEl = document.getElementById('filters-popover');
        const hoverEl = document.getElementById('filters-hover');

        if (!popoverEl || !hoverEl) {
            console.error('Popover elements not found');
            return;
        }

        // Initialiser le popover principal
        this.popover = $('#filters-popover').popover({
            placement: 'bottom',
            html: true,
            content: '',
            title: 'useless',
        });

        // Initialiser le hover popover
        this.hover = $('#filters-hover').popover({
            placement: 'bottom',
            html: true,
            content: () => this.infos(),
            title: tr("Current criteria"),
        });
    }

    initEventListeners() {
        // Events pour le hover info
        this.button.addEventListener('mouseenter', () => this.showinfo());
        this.button.addEventListener('mouseleave', () => this.hideinfo());

        // Event pour le toggle principal
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Toggle filters button clicked");
            this.toggle();
        });

        // Event pour fermer
        const closeBtn = document.getElementById('filters-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggle());
        }

        // Events pour les champs existants
        this.attachFieldEvents();
    }

    attachFieldEvents() {
        document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });
    }

    tip() {
        // Retourner l'élément tip du popover Bootstrap
        try {
            if (this.popover && this.popover.length > 0) {
                const popoverData = this.popover.data('bs.popover');
                console.log('Popover data:', popoverData);
                if (popoverData && popoverData.tip) {
                    console.log('Popover tip found:', popoverData.tip);
                    return $(popoverData.tip);
                }
            }
        } catch (error) {
            console.error('Error getting popover tip:', error);
        }
        return null;
    }

    async load_filter_form(mapsync) {
        const mainfilter = document.getElementById('mainfilter');
        if (!mainfilter || this.loaded_form) {
            return;
        }

        const filterUrl = mainfilter.getAttribute('filter-url');
        if (!filterUrl) {
            console.error('Filter URL not found');
            return;
        }

        console.log('Loading filter form from:', filterUrl);
        try {
            const response = await fetch(filterUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();

            // Cacher le spinner
            const spinner = document.querySelector('#filters-panel .filter-spinner-container');
            if (spinner) {
                spinner.style.display = 'none';
            }

            // Remplacer le contenu
            mainfilter.outerHTML = responseText;
            const newMainFilter = document.getElementById('mainfilter');

            if (!newMainFilter) {
                throw new Error('New main filter not found after replacement');
            }

            // Configuration mapsync
            if (mapsync?.options?.filter) {
                mapsync.options.filter.form = newMainFilter;
            }

            // Attacher les événements aux boutons
            this.attachFormEvents(mapsync, newMainFilter);

            // Gestion des select multiples avec Chosen
            this.setupChosenSelects(newMainFilter);

            // Réorganiser les filtres right
            this.reorganizeRightFilters(newMainFilter);

            // Dispatch custom event
            this.dispatchFilterEvent();

            this.loaded_form = true;

        } catch (error) {
            console.error('Error loading filter form:', error);
            this.showError('Erreur lors du chargement des filtres');
        }
    }

    attachFormEvents(mapsync, newMainFilter) {
        // Events pour submit et reset
        const filterBtn = document.getElementById('filter');
        const resetBtn = document.getElementById('reset');

        if (filterBtn && mapsync?._onFormSubmit) {
            filterBtn.addEventListener('click', (e) => mapsync._onFormSubmit(e));
        }

        if (resetBtn && mapsync?._onFormReset) {
            resetBtn.addEventListener('click', (e) => mapsync._onFormReset(e));
        }

        // Events pour les champs
        newMainFilter.querySelectorAll('select, input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });

        // Event pour reset avec timeout pour Chosen
        newMainFilter.addEventListener('reset', () => {
            setTimeout(() => {
                newMainFilter.querySelectorAll('select[multiple]').forEach(select => {
                    const event = new Event('chosen:updated');
                    select.dispatchEvent(event);
                });
            }, 1);
        });
    }

    setupChosenSelects(newMainFilter) {
        // Gestion des select multiples avec Chosen (si disponible)
        const multipleSelects = newMainFilter.querySelectorAll('select[multiple]');

        multipleSelects.forEach(select => {
            // Si Chosen est disponible
            if (typeof $.fn.chosen === 'function') {
                $(select).chosen();
            }

            // Event listener pour la classe filter-set
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

    reorganizeRightFilters(newMainFilter) {
        const rightContainer = document.querySelector('#mainfilter > .right');
        if (!rightContainer) return;

        newMainFilter.querySelectorAll('.right-filter').forEach(filter => {
            const p = filter.closest('p');
            if (p) {
                rightContainer.appendChild(p);
            }
        });
    }

    // Méthode pour dispatcher un événement de filtre, y jeter un oeil une fois que tout sera en place
    dispatchFilterEvent() {
        const context = document.body.dataset;
        if (context?.modelname) {
            window.dispatchEvent(new CustomEvent('entity:view:filter', {
                detail: { modelname: context.modelname }
            }));
        }
    }

    showError(message) {
        console.error(message);
    }

    showinfo() {
        // Si le popover principal est visible, ne pas montrer le hover
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

    hideinfo() {
        if (this.hover) {
            try {
                this.hover.popover('hide');
            } catch (error) {
                console.error('Error hiding info popover:', error);
            }
        }
    }

    infos() {
        if (Object.keys(this.fields).length === 0) {
            return "<p>" + tr("No filter") + "</p>";
        }

        return Object.values(this.fields).map(f => {
            const safeValue = this.escapeHtml(f.value);
            const safeLabel = this.escapeHtml(f.label);
            return `<p><span class="filter-info">${safeLabel}</span>: ${safeValue}</p>`;
        }).join('');
    }

    escapeHtml(str) {
        if (str === null || str === undefined) return '';

        return String(str).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        }[char]));
    }

    toggle() {
        if (!this.popover) {
            console.warn('Popover not initialized');
            return;
        }

        if (this.visible) {
            this.hidePopover();
        } else {
            console.log("Showing filters popover");
            this.showPopover();
        }

        this.visible = !this.visible;
    }

    showPopover() {
        // Cacher le hover info d'abord
        this.hideinfo();

        if (!this.popover) {
            console.error('Popover not initialized');
            return;
        }

        try {
            // Afficher le popover
            this.popover.popover('show');

            // Attendre que le popover soit créé dans le DOM
            setTimeout(() => {
                const tip = this.tip();
                if (tip && tip.length > 0) {
                    this.setupPopoverContent();
                    this.attachOutsideClickListener();
                } else {
                    console.error('Popover tip still not found after show');
                }
            }, 100); // Augmenter le délai

        } catch (error) {
            console.error('Error showing popover:', error);
        }
    }

    hidePopover() {
        const tip = this.tip();

        // Remettre le panel dans le wrapper avant de fermer
        if (tip && tip.length > 0) {
            const panel = tip.find('#filters-panel');
            const wrapper = document.getElementById('filters-wrapper');
            if (panel.length > 0 && wrapper) {
                wrapper.appendChild(panel[0]);
            }
        }

        // Cacher le popover
        try {
            this.popover.popover('hide');
        } catch (error) {
            console.error('Error hiding popover:', error);
        }

        // Retirer l'event listener
        this.removeOutsideClickListener();
    }

    setupPopoverContent() {
        const tip = this.tip();
        if (!tip || tip.length === 0) {
            console.warn('Popover tip not found for setup');
            return;
        }

        try {
            // Vider le contenu et ajouter la flèche
            tip.empty().append('<div class="arrow"/>');

            // Déplacer le panel du wrapper vers le tip
            const panel = $('#filters-wrapper #filters-panel');
            if (panel.length > 0) {
                tip.append(panel.detach());

                // Ajuster la largeur basée sur le formulaire
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

    attachOutsideClickListener() {
        // Utiliser la méthode jQuery pour les événements avec namespace
        $(document).on('click.filtersOutside', (e) => {
            const tip = this.tip();
            const target = e.target;

            if (!tip || tip.length === 0) return;

            // Vérifier si le clic est à l'extérieur
            const isOutsideTip = tip.has(target).length === 0;
            const isOutsideButton = !this.button.contains(target);

            if (isOutsideTip && isOutsideButton) {
                this.toggle();
            }
        });
    }

    removeOutsideClickListener() {
        $(document).off('click.filtersOutside');
    }

    setfield(field) {
        if (!field || !field.name) return false;

        const $field = $(field);
        const name = field.name;
        const label = $field.data('label') || name;
        let val = $field.val();
        let set = val !== '' && val !== null && !Array.isArray(val) || (Array.isArray(val) && val.length > 0 && val[0] !== '');

        // Logique pour différents types de champs (comme dans l'original)
        if ($field.is('input[type=hidden]')) {
            set = false;
        } else if ($field.is('select[multiple]')) {
            set = val !== null && val.length > 0;
        } else if ($field.is('select')) {
            const firstOptionVal = $field.find('option').first().val();
            set = val !== firstOptionVal;
        }

        // Déterminer la valeur d'affichage
        let value = val;
        if (field.tagName === 'SELECT') {
            value = $field.find('option:selected').toArray()
                .map(option => $(option).text())
                .join(', ');
        }

        // Mettre à jour les champs et classes
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