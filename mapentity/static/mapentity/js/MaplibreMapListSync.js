class MaplibreMapListSync {
    /**
     * Constructeur de MaplibreMapListSync
     * @param datatable {DataTable} - L'instance de DataTable à synchroniser avec la carte MapLibre
     * @param map {maplibregl.Map} - L'instance de la carte MapLibre à synchroniser avec la liste
     * @param objectsLayer {MaplibreObjectsLayer} - L'instance de MaplibreObjectsLayer pour gérer les objets de la carte
     * @param togglableFiltre {MaplibreMapentityTogglableFiltre} - L'instance de MaplibreMapentityTogglableFiltre pour gérer les filtres
     * @param history {MaplibreMapentityHistory} - L'instance de MaplibreMapentityHistory pour gérer l'historique des actions
     */
    constructor(datatable, map, objectsLayer, togglableFiltre, history) {
        this.dt = datatable;
        this.map = map;
        this.layer = objectsLayer;
        this.togglableFiltre = togglableFiltre;
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
     * Initialisation de MaplibreMapListSync
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
     * Callback pour le filtrage de la liste
     * @private
     */
    _onListFilter() {
        const results = this.dt.column(0).data().toArray();
        this.layer.updateFromPks(results);
        this._handleReloaded(results.length);
    }

    /**
     * Assure que l'historique est mis à jour avec le nombre d'enregistrements rechargés
     * @param nbrecords {number} - Le nombre d'enregistrements rechargés
     * @private
     */
    _handleReloaded(nbrecords) {
            this.history.saveListInfo({ model: this.options.modelname, nb: nbrecords });
            this.togglableFiltre.setsubmit();
    }

    /**
     * Callback pour les changements de vue de la carte
     * @param e {Object} - L'événement de changement de vue de la carte
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
     * Callback pour la soumission du formulaire de filtre
     * @param e {Event} - L'événement de soumission du formulaire
     * @private
     */
    _onFormSubmit(e) {
        this._formSetBounds();
        this._reloadList(true);
    }

    /**
     * Callback pour la réinitialisation du formulaire de filtre
     * @param e {Event} - L'événement de réinitialisation du formulaire
     * @private
     */
    _onFormReset(e) {
        this._formClear(this.options.filter.form);
        this._reloadList();
        this._formSetBounds();
    }

    /**
     * Recharge la liste d'entités affichées sur la carte
     * @param mapViewChangedStatue {boolean} - Indique si la vue de la carte a été modifiée
     * @returns {Promise<boolean>} - Retourne une promesse qui se résout en false si le chargement est terminé
     * @private
     */
    async _reloadList(mapViewChangedStatue = false) {
        const formData = new FormData(this.options.filter.form);
        let filter = false;

        for (const value of formData.values()) {
            if (value.name !== 'bbox') {
                if (value.value !== '') {
                    filter = true;
                }
            }
        }

        if(!mapViewChangedStatue) {
            if (filter) {
                this.togglableFiltre.button.classList.remove('btn-info');
                this.togglableFiltre.button.classList.add('btn-warning');
            } else {
                this.togglableFiltre.button.classList.remove('btn-warning');
                this.togglableFiltre.button.classList.add('btn-info');
            }
        }


        // Mettre à jour l'URL de la DataTable avec les paramètres du formulaire
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

        return false;
    }

    /**
     * Met à jour les bornes du formulaire de filtre en fonction de la vue actuelle de la carte
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

        const bounds = this.map.getBounds(); // Le bounds utilisé doit être celle étudiée à la carte car elle est dynamique.

        // Extraire les coordonnées et les borner aux valeurs valides
        const min_lon = Math.max(bounds.getWest(), -180);
        const min_lat = Math.max(bounds.getSouth(), -90);
        const max_lon = Math.min(bounds.getEast(), 180);
        const max_lat = Math.min(bounds.getNorth(), 90);

        // Créer un rectangle MaplibreRectangle à partir de ces coordonnées
        const rect = new MaplibreRectangle([[min_lon, min_lat], [max_lon, max_lat]]);

        // Vérifier que bboxfield existe avant d'y accéder
        if (this.options.filter && this.options.filter.bboxfield) {
            // Mettre à jour le champ bbox du filtre avec le WKT du rectangle
            this.options.filter.bboxfield.value = rect.getWKT();
        }
    }

    /**
     * Efface les champs du formulaire de filtre
     * @param form {HTMLFormElement} - Le formulaire à effacer
     * @private
     */
    _formClear(form) {
        // selection des champs de saisie texte, mot de passe, fichier, nombre, sélecteurs et zones de texte
        const elements = form.querySelectorAll('input[type="text"], input[type="password"], input[type="file"], input[type="number"], select, textarea');
        elements.forEach(el => {
            el.value = '';
            el.dispatchEvent(new Event('change'));
        });

        // Selection des inputs de type radio, checkbox et options de select
        const radioCheckboxElements = form.querySelectorAll('input[type="radio"], input[type="checkbox"], select option');
        radioCheckboxElements.forEach(el => {
            el.removeAttribute('checked');
            el.removeAttribute('selected');
        });

        const selectElements = form.querySelectorAll('select');
        selectElements.forEach(select => {
            select.value = '';
            select.dispatchEvent(new Event('chosen:updated')); // chosen est une bibliothèque JS pour les sélecteurs, pas possible de l'enlever
        });
    }
}
