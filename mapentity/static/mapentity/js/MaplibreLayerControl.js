class MaplibreLayerControl {
    constructor(layerManager) {
        this.layerManager = layerManager;
        this._container = null;
        this._map = null;

        this._baseLayers = new Map();
        this._overlays = {};
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
        this._map.on('layerManager:overlayAdded', (e) => this._handleOverlayEvent(e, menu));

        return this._container;
    }

    /**
     * Remplit le conteneur avec les couches de base disponibles.
     * @param {HTMLElement} container - Le conteneur dans lequel ajouter les couches de base.
     * @private
     */
    _populateBaseLayers(container) {
        const layers = this.layerManager.getLayers(); // on utilise layerManager ici
        const radioGroupName = 'baseLayer';

        const baseLayerEntries = Object.entries(layers.baseLayers);
        let firstLayerId = null;
        let firstInput = null;

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

            if (index === 0) {
                firstLayerId = id;
                firstInput = input;
            }

            input.addEventListener('change', (e) => {
                if (e.target.checked) {
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

        // Sélection automatique de la première couche
        console.log('firstLayerId', firstLayerId);
        console.log('firstInput', firstInput);
        if (firstLayerId && firstInput) {
            firstInput.checked = true;

            Object.values(layers.baseLayers).forEach(layerId => {
                this.layerManager.toggleLayer(layerId, false);
            });

            this.layerManager.toggleLayer(firstLayerId, true);

            if (this._map.getLayer('measure-points')) {
                this._map.moveLayer('measure-points');
            }
            if (this._map.getLayer('measure-lines')) {
                this._map.moveLayer('measure-lines');
            }

            this._map.fire('baseLayerSelected', {
                layerId: firstLayerId,
                isDefault: true
            });
        }
    }


    _handleOverlayEvent(event, menu) {
        const { category, primaryKey, layerIds } = event;

        if (!this._overlays[category]) {
            this._overlays[category] = {};

            const hr = document.createElement('hr');
            hr.style.margin = '0';
            menu.appendChild(hr);

            const categoryTitle = document.createElement('div');
            categoryTitle.textContent = category;
            categoryTitle.style.fontWeight = 'bold';
            categoryTitle.style.marginBottom = '5px';
            categoryTitle.dataset.category = category;
            menu.appendChild(categoryTitle);
        }

        if (this._overlays[category][primaryKey]) return;

        this._overlays[category][primaryKey] = layerIds;

        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        input.dataset.layerId = primaryKey;

        label.appendChild(input);
        label.append(` ${category}`);
        menu.appendChild(label);
        menu.appendChild(document.createElement('br'));

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

    onRemove() {
        this._container.remove();
        this._map = null;
    }
}
