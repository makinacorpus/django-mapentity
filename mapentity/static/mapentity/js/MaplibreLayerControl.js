class MaplibreLayerControl {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this._container = null;
        this._map = null;
        this._firstBaseLayerInput = null; // Stocker la référence
    }

    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', 'Layer Controller');
        button.className = 'layer-switcher-btn';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/layers-2x.png';
        img.alt = 'Layers';
        img.style.width = '25px';
        img.style.height = '25px';
        button.appendChild(img);
        this._container.appendChild(button);

        const menu = document.createElement('div');
        menu.className = 'layer-switcher-menu';
        menu.style.display = 'none';
        menu.style.width = '200px';
        menu.style.padding = '5px';
        this._container.appendChild(menu);

        button.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!this._container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        this._populateBaseLayers(menu);

        // Activer automatiquement la première couche APRÈS population
        this._activateFirstBaseLayer();

        this._map.on('layerManager:overlayAdded', () => this._populateOverlaysLayers(menu));

        return this._container;
    }

    /**
     * Active automatiquement la première couche de base
     * @private
     */
    _activateFirstBaseLayer() {
        if (this._firstBaseLayerInput) {
            console.log('Activating first base layer immediately');
            this._firstBaseLayerInput.checked = true;

            // Déclencher l'événement change immédiatement
            const changeEvent = new Event('change', { bubbles: true });
            this._firstBaseLayerInput.dispatchEvent(changeEvent);
            // this._firstBaseLayerInput.click();
        }
    }

    /**
     * Remplit le conteneur avec les couches de base disponibles.
     * @param {HTMLElement} container - Le conteneur dans lequel ajouter les couches de base.
     * @private
     */
    _populateBaseLayers(container) {
        console.log('populate base layer');
        const layers = this.layerManager.getLayers();
        const radioGroupName = 'baseLayer';

        const baseLayerEntries = Object.entries(layers.baseLayers);

        for (const [index, [name, id]] of baseLayerEntries.entries()) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = radioGroupName;
            input.checked = false;
            input.dataset.layerId = id;

            label.appendChild(input);
            label.append(` ${name}`);
            container.appendChild(label);
            container.appendChild(document.createElement('br'));

            // Stocker la référence du premier input
            if (index === 0) {
                this._firstBaseLayerInput = input;
            }

            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log('Layer change triggered for:', id);
                    Object.values(layers.baseLayers).forEach(layerId => {
                        this.layerManager.toggleLayer(layerId, false);
                    });

                    this.layerManager.toggleLayer(id, true);

                    if (this._map.getLayer('measure-points')) {
                        this._map.moveLayer('measure-points');
                    }
                    if (this._map.getLayer('measure-lines')) {
                        this._map.moveLayer('measure-lines');
                    }
                }
            });
        }
    }

    /**
     * Ajoute dynamiquement les overlays au menu à partir du layerManager.
     * @param {HTMLElement} menu - Le conteneur DOM dans lequel injecter les overlays.
     * @private
     */
    _populateOverlaysLayers(menu) {
        const layers = this.layerManager.getLayers();
        const overlays = layers.overlays;

        // Nettoyer les anciens overlays après le <hr>
        const existingHr = menu.querySelector('hr');
        if (existingHr) {
            let next = existingHr.nextElementSibling;
            while (next) {
                const toRemove = next;
                next = next.nextElementSibling;
                toRemove.remove();
            }
        } else {
            const hr = document.createElement('hr');
            hr.style.margin = '0';
            menu.appendChild(hr);
        }

        // Injecter les overlays groupés par catégorie
        for (const [category, group] of Object.entries(overlays)) {
            // Titre de la catégorie
            const categoryTitle = document.createElement('div');
            categoryTitle.textContent = category;
            categoryTitle.style.fontWeight = 'bold';
            categoryTitle.style.marginBottom = '5px';
            categoryTitle.dataset.category = category;
            menu.appendChild(categoryTitle);

            for (const [primaryKey, info] of Object.entries(group)) {
                const { layerIds, labelHTML } = info;

                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = true;
                input.dataset.layerId = primaryKey;

                label.appendChild(input);

                // Injecter du HTML (nom coloré, etc.)
                const span = document.createElement('span');
                span.innerHTML = ` ${labelHTML}`;
                label.appendChild(span);

                menu.appendChild(label);
                menu.appendChild(document.createElement('br'));

                // Événement checkbox
                input.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    this.layerManager.toggleLayer(layerIds, isChecked);

                    if (this._map.getLayer('measure-points')) {
                        this._map.moveLayer('measure-points');
                    }
                    if (this._map.getLayer('measure-lines')) {
                        this._map.moveLayer('measure-lines');
                    }
                });
            }
        }
    }


}