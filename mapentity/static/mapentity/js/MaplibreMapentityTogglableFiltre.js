class MaplibreMapentityTogglableFiltre {
    /**
     * Constructeur de la classe MaplibreMapentityTogglableFiltre
     */
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

    /**
     * Initialise le popover pour les filtres
     */
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
     * Initialise les écouteurs d'événements pour les boutons et champs
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
     * Attache les événements aux champs du formulaire de filtre
     */
    attachFieldEvents() {
        document.querySelectorAll('#mainfilter select, #mainfilter input').forEach(element => {
            element.addEventListener('change', () => this.setfield(element));
        });
    }

    /**
     *  Accessor pour obtenir l'élément tip du popover
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
     * Charge le formulaire de filtre depuis l'URL spécifiée dans l'attribut filter-url
     * @param mapsync {MaplibreMapListSync} - Instance de MaplibreMapListSync pour la synchronisation des filtres
     * @returns {Promise<void>} - Retourne une promesse qui se résout lorsque le formulaire est chargé
     */
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

            // Attacher les événements aux boutons
            this._attachFormEvents(mapsync, newMainFilter);

            // Gestion des select multiples avec Chosen
            this._setupChosenSelects(newMainFilter);

            // Réorganiser les filtres right
            this._reorganizeRightFilters(newMainFilter);

            // Dispatch custom event
            this._dispatchFilterEvent();

            this.loaded_form = true;

        } catch (error) {
            console.error('Error loading filter form:', error);
            this.showError('Erreur lors du chargement des filtres');
        }
    }

    /**
     * Attache les événements aux boutons de filtre et aux champs du formulaire
     * @param mapsync {MaplibreMapListSync} - Instance de MaplibreMapListSync pour la synchronisation des filtres
     * @param newMainFilter {HTMLElement} - Le nouvel élément de filtre principal
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

    /**
     * Configure les sélecteurs multiples avec Chosen
     * @param newMainFilter {HTMLElement} - Le nouvel élément de filtre principal
     * @private
     */
    _setupChosenSelects(newMainFilter) {

        const multipleSelects = newMainFilter.querySelectorAll('select[multiple]');

        multipleSelects.forEach(select => {

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

    /**
     * Réorganise les filtres de droite dans le conteneur principal
     * @param newMainFilter {HTMLElement} - Le nouvel élément de filtre principal
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
     * Déclenche un événement personnalisé pour les filtres
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
     * Affiche un message d'erreur dans la console
     * @param message
     */
    showError(message) {
        console.error(message);
    }

    /**
     * Affiche le popover d'information (hover) si le popover principal n'est pas visible
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
     * Cache le popover d'information (hover) si il est visible
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
     * Affiche les informations des filtres actifs
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
     * Échappe les caractères spéciaux HTML dans une chaîne
     * @param str {string|null|undefined} - La chaîne à échapper
     * @returns {string} - La chaîne échappée
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
     * Bascule l'affichage du popover de filtres
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
     * Affiche le popover de filtres
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
     * Cache le popover de filtres
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

    /**
     * Attache un écouteur d'événements pour les clics à l'extérieur du popover
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
     * Supprime l'écouteur d'événements pour les clics à l'extérieur du popover
     */
    removeOutsideClickListener() {
        $(document).off('click.filtersOutside');
    }

    /**
     * Met à jour l'état d'un champ de filtre
     * @param field {HTMLElement} - L'élément de champ à mettre à jour
     * @returns {boolean} - Retourne true si le champ est défini, false sinon
     */
    setfield(field) {
        if (!field || !field.name) return false;

        const $field = $(field);
        const name = field.name;
        const label = $field.data('label') || name;
        let val = $field.val();
        let set = val !== '' && val !== null && !Array.isArray(val) || (Array.isArray(val) && val.length > 0 && val[0] !== '');

        // Logique pour différents types de champs
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

    /**
     * Met à jour l'état du bouton de soumission en fonction des filtres actifs
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