class MaplibreLayerControl {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this._map = null;
        this._container = null;
        this._menu = null;
        this._firstBaseLayerInput = null;
        this._lazyInputs = new Map();
    }

    onAdd(map) {
        this._map = map;
        this._container = this._createContainer();
        this._menu = this._createMenu();
        this._container.appendChild(this._menu);

        this._updateMenu();

        this._map.on('layerManager:overlayAdded', () => this._updateMenu());
        this._map.on('layerManager:baseLayerAdded', () => this._updateMenu());
        this._map.on('layerManager:lazyOverlayAdded', () => this._updateMenu());
        this._map.on('layerManager:loadingError', (e) => this._handleLoadingError(e.primaryKey));

        return this._container;
    }

    _updateMenu() {
        if (!this._menu) return;
        this._menu.innerHTML = '';
        this._populateBaseLayers(this._menu);
        this._activateFirstBaseLayer();

        const { overlays, lazyOverlays } = this.layerManager.getLayers();

        // Ajoute les overlays chargés (Mapbox) juste après les fonds de plan
        if (Object.keys(overlays).length > 0) {
            this._populateOverlaysLayers();
        }

        // Ajoute un séparateur avant les couches additionnelles des autres modules (lazy)
        if (Object.keys(lazyOverlays).length > 0) {
            this._ensureSeparator();
            this._populateLazyOverlaysLayers();
        }
    }

    _createContainer() {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const button = document.createElement('button');
        button.type = 'button';
        button.title = gettext('Layer controller');
        button.className = 'layer-switcher-btn';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/layers-2x.png';
        img.alt = 'Layers';
        img.style.width = '25px';
        img.style.height = '25px';

        button.appendChild(img);
        container.appendChild(button);

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this._menu.style.display = this._menu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                this._menu.style.display = 'none';
            }
        });

        return container;
    }

    _createMenu() {
        const menu = document.createElement('div');
        menu.className = 'layer-switcher-menu';
        menu.style = "display: none;";
        return menu;
    }

    /**
     * Active automatiquement la première couche de base
     * @private
     */
    _activateFirstBaseLayer() {
        if (this._firstBaseLayerInput && !this.layerManager.currentBaseLayerId) {
            this._firstBaseLayerInput.checked = true;
            // Déclencher l'événement change immédiatement
            const changeEvent = new Event('change', { bubbles: true });
            this._firstBaseLayerInput.dispatchEvent(changeEvent);
        }
    }

    _handleLoadingError(primaryKey) {
        const input = this._lazyInputs.get(primaryKey);
        if (input) {
            input.checked = false;
            input.disabled = false;

            const label = input.parentElement;
            if (label) {
                label.style.color = 'red';
                setTimeout(() => (label.style.color = ''), 3000);
            }
        }
    }

    /**
     * Remplit le conteneur avec les couches de base disponibles.
     * @param {HTMLElement} container - Le conteneur dans lequel ajouter les couches de base.
     * @private
     */
    _populateBaseLayers(container) {
        const baseLayers = this.layerManager.getLayers().baseLayers;
        const restoredLayers = this.layerManager.restoredContext?.maplayers || [];

        Object.entries(baseLayers).forEach(([name, id], index) => {
            const label = document.createElement('label');
            const input = document.createElement('input');

            input.type = 'radio';
            input.name = 'baseLayer';
            input.value = name.toLowerCase();
            input.dataset.layerId = id;

            // Maintain checked state if already selected
            const currentBaseLayerId = this.layerManager.currentBaseLayerId;
            const isRestored = restoredLayers.includes(name.trim());

            if (currentBaseLayerId === id || isRestored) {
                input.checked = true;
                this.layerManager.currentBaseLayerId = id;
                this.layerManager.toggleLayer(id, true);
            }

            if (index === 0) {
                this._firstBaseLayerInput = input;
            }

            label.appendChild(input);
            label.append(` ${name}`);
            label.classList.add('layer-entry');
            container.appendChild(label);

            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    Object.values(baseLayers).forEach(layerId => {
                        this.layerManager.toggleLayer(layerId, false);
                    });
                    this.layerManager.toggleLayer(id, true);
                    this.layerManager.currentBaseLayerId = id;

                    // Remet les couches de mesure au-dessus
                    ['measure-points', 'measure-lines'].forEach(layer => {
                        if (this._map.getLayer(layer)) {
                            this._map.moveLayer(layer);
                        }
                    });
                }
            });
        });
    }


    _populateOverlaysLayers() {
        const overlays = this.layerManager.getLayers().overlays;
        const restoredLayers = this.layerManager.restoredContext?.maplayers || [];

        // Tri explicite des catégories pour avoir "Overlays" avant "Objects"
        const sortedCategories = Object.keys(overlays).sort((a, b) => {
            const catOverlays = gettext('Overlays');
            const catObjects = gettext('Objects');
            
            if (a === catOverlays) return -1;
            if (b === catOverlays) return 1;
            if (a === catObjects && b !== catOverlays) return 1;
            if (b === catObjects && a !== catOverlays) return -1;
            return a.localeCompare(b);
        });

        for (const category of sortedCategories) {
            const group = overlays[category];
            const title = document.createElement('div');
            title.textContent = category;
            title.style.fontWeight = 'bold';
            title.style.marginTop = '10px';
            title.dataset.overlayType = 'loaded';
            this._menu.appendChild(title);

            for (const [primaryKey, overlay] of Object.entries(group)) {
                const { labelHTML, layerIds } = overlay;

                const label = document.createElement('label');
                label.dataset.overlayType = 'loaded';

                const input = document.createElement('input');
                input.type = 'checkbox';
                const labelText = labelHTML.replace(/<[^>]*>?/gm, '').trim();
                
                // Vérifier si la couche est dans le contexte restauré
                // Par défaut, on coche toujours la catégorie "Objects" (couche du modèle courant)
                const isRestored = restoredLayers.includes(labelText);
                const isObjectsCategory = category === gettext('Objects');
                input.checked = isObjectsCategory || isRestored;

                label.appendChild(input);
                label.insertAdjacentHTML('beforeend', ` ${labelHTML}`);
                label.classList.add('layer-entry');
                this._menu.appendChild(label);

                // Si restauré ou coché par défaut, s'assurer que la couche est visible sur la carte
                if (input.checked) {
                    this.layerManager.toggleLayer(primaryKey, true);
                }

                input.addEventListener('change', () => {
                    this.layerManager.toggleLayer(primaryKey, input.checked);
                });
            }
        }
    }

    _populateLazyOverlaysLayers() {
        const { lazyOverlays } = this.layerManager.getLayers();
        const restoredLayers = this.layerManager.restoredContext?.maplayers || [];

        for (const [category, group] of Object.entries(lazyOverlays)) {
            const title = document.createElement('div');
            title.textContent = category;
            title.style.fontWeight = 'bold';
            title.style.marginTop = '10px';
            title.dataset.overlayType = 'lazy';
            this._menu.appendChild(title);

            for (const [primaryKey, lazyLayer] of Object.entries(group)) {
                const { labelHTML, isVisible } = lazyLayer;

                const label = document.createElement('label');
                label.dataset.overlayType = 'lazy';

                const input = document.createElement('input');
                input.type = 'checkbox';
                const labelText = labelHTML.replace(/<[^>]*>?/gm, '').trim();
                
                const isRestored = restoredLayers.includes(labelText);
                input.checked = isVisible || isRestored;
                this._lazyInputs.set(primaryKey, input);

                label.appendChild(input);
                label.insertAdjacentHTML('beforeend', ` ${labelHTML}`);
                label.classList.add('layer-entry');
                this._menu.appendChild(label);

                // Si restauré comme coché mais pas encore visible (pas chargé), on le déclenche
                if (isRestored && !isVisible) {
                    this.layerManager.toggleLazyOverlay(category, primaryKey, true).then(success => {
                        if (success) {
                            input.checked = true;
                            input.disabled = false;
                        } else {
                            this._handleLoadingError(primaryKey);
                        }
                    });
                    input.disabled = true;
                }

                input.addEventListener('change', async () => {
                    input.disabled = true;
                    const success = await this.layerManager.toggleLazyOverlay(category, primaryKey, input.checked);
                    if (!success) {
                        this._handleLoadingError(primaryKey);
                    } else {
                        input.disabled = false;
                    }
                });
            }
        }
    }

    _ensureSeparator() {
        if (!this._menu.querySelector('hr')) {
            const hr = document.createElement('hr');
            hr.style.margin = '0';
            hr.dataset.type = 'separator';
            this._menu.appendChild(hr);
        }
    }

    _cleanupOverlaySection(type) {
        const elementsToRemove = Array.from(this._menu.children)
            .filter(el => el.dataset.overlayType === type);
        elementsToRemove.forEach(el => el.remove());
    }
}
