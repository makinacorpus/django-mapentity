class MaplibreLayerControl {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this._map = null;
        this._container = null;
        this._menu = null;
        this._firstBaseLayerInput = null;
        this._lazyInputs = new Map(); // Clé = primaryKey
    }

    onAdd(map) {
        this._map = map;
        this._container = this._createContainer();
        this._menu = this._createMenu();
        this._container.appendChild(this._menu);

        this._populateBaseLayers(this._menu);
        this._activateFirstBaseLayer();

        this._map.on('layerManager:overlayAdded', () => this._populateOverlaysLayers());
        this._map.on('layerManager:lazyOverlayAdded', () => this._populateLazyOverlaysLayers());
        this._map.on('layerManager:loadingError', (e) => this._handleLoadingError(e.primaryKey));

        return this._container;
    }

    _createContainer() {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const button = document.createElement('button');
        button.type = 'button';
        button.title = 'Layer Controller';
        button.className = 'layer-switcher-btn';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/layers-2x.png';
        img.alt = 'Layers';
        img.style.width = '25px';
        img.style.height = '25px';

        button.appendChild(img);
        container.appendChild(button);

        button.addEventListener('click', () => {
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
        Object.assign(menu.style, {
            display: 'none',
            width: '200px',
            padding: '5px',
            maxHeight: '800px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid #ccc',
            boxShadow: '0px 2px 6px rgba(0,0,0,0.2)',
            zIndex: '1000'
        });
        menu.className = 'layer-switcher-menu';
        return menu;
    }

    /**
     * Active automatiquement la première couche de base
     * @private
     */
    _activateFirstBaseLayer() {
        if (this._firstBaseLayerInput) {
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

        Object.entries(baseLayers).forEach(([name, id], index) => {
            const label = document.createElement('label');
            const input = document.createElement('input');

            input.type = 'radio';
            input.name = 'baseLayer';
            input.dataset.layerId = id;

            if (index === 0) this._firstBaseLayerInput = input;

            label.appendChild(input);
            label.append(` ${name}`);
            label.classList.add('layer-entry');
            container.appendChild(label);
            // container.appendChild(document.createElement('br'));

            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    Object.values(baseLayers).forEach(layerId => {
                        this.layerManager.toggleLayer(layerId, false);
                    });
                    this.layerManager.toggleLayer(id, true);

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
        this._cleanupOverlaySection('loaded');
        this._ensureSeparator();

        for (const [category, group] of Object.entries(overlays)) {
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
                input.checked = true;

                label.appendChild(input);
                label.insertAdjacentHTML('beforeend', ` ${labelHTML}`);
                label.classList.add('layer-entry');
                this._menu.appendChild(label);
                // this._menu.appendChild(document.createElement('br'));

                input.addEventListener('change', () => {
                    this.layerManager.toggleLayer(layerIds, input.checked);
                });
            }
        }
    }

    _populateLazyOverlaysLayers() {
        const lazyOverlays = this.layerManager.getLayers().lazyOverlays;
        this._cleanupOverlaySection('lazy');
        this._ensureSeparator();

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
                input.checked = isVisible;
                this._lazyInputs.set(primaryKey, input);

                label.appendChild(input);
                label.insertAdjacentHTML('beforeend', ` ${labelHTML}`);
                label.classList.add('layer-entry');
                this._menu.appendChild(label);
                // this._menu.appendChild(document.createElement('br'));

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
