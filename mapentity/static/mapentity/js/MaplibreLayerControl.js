class MaplibreLayerControl {
    constructor(objectsLayer) {
        this.objectsLayer = objectsLayer;
        this._container = null;
    }

    onAdd(map) {
        this._map = map;

        // Créer le conteneur principal
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        // Bouton pour ouvrir/fermer le menu
        const button = document.createElement('button');
        button.className = 'layer-switcher-btn';
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/layers-2x.png';
        img.alt = 'Couches';
        img.style.width = '25px';
        img.style.height = '25px';
        button.appendChild(img);
        this._container.appendChild(button);

        // Dropdown menu
        const menu = document.createElement('div');
        menu.className = 'layer-switcher-menu';
        menu.style.display = 'none';
        menu.style.width = '200px';
        menu.style.padding = '5px';
        this._container.appendChild(menu);

        // Remplir dynamiquement le menu
        this._populateBaseLayers(menu);
        this._populateOverlays(menu);

        // Toggle affichage menu
        button.addEventListener('click', () => {
            menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
        });

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!this._container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        // Écouter l'événement layers:added
        this._map.on('layers:added', () => {
            this._populateOverlays(menu);
        });

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    _populateBaseLayers(container) {
        const layers = this.objectsLayer.getLayers();

        // Group name for radio buttons
        const radioGroupName = 'baseLayer';

        for (const [name, id] of Object.entries(layers.baseLayers)) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = radioGroupName; // Same name for all radio buttons in the group
            input.checked = false;
            input.dataset.layerId = id;
            label.appendChild(input);
            label.append(` ${name}`);
            container.appendChild(label);
            container.appendChild(document.createElement('br'));

            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                    // Hide all base layers
                    Object.values(layers.baseLayers).forEach(layerId => {
                        this.objectsLayer.toggleLayer(layerId, false);
                    });
                    // Show the selected base layer
                    this.objectsLayer.toggleLayer(id, true);
                    console.log(`Base Layer ${id} toggled: ${isChecked}`);

                    // Ensure baseLayer is below measure-points
                    if (this._map.getLayer('measure-points')) {
                        this._map.moveLayer('measure-points');
                        this._map.moveLayer('measure-lines');
                    }
                }
            });
        }
    }

    _populateOverlays(container) {
        const layers = this.objectsLayer.getLayers();

        const hr = document.createElement('hr');
        hr.style.margin = 0;
        container.appendChild(hr);

        for (const [category, group] of Object.entries(layers.overlays)) {
            const categoryTitle = document.createElement('div');
            categoryTitle.textContent = category;
            categoryTitle.style.fontWeight = 'bold';
            categoryTitle.style.marginBottom = '5px';
            container.appendChild(categoryTitle);

            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = true;
            input.dataset.category = category;
            label.appendChild(input);
            label.append(` ${category}`);
            container.appendChild(label);
            container.appendChild(document.createElement('br'));

            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;

                for (const [name, id] of Object.entries(group)) {
                    this.objectsLayer.toggleLayer(id, isChecked);
                    console.log(`Overlay Layer ${id} toggled: ${isChecked}`);

                    if (isChecked) {
                        // Place l’overlay juste avant 'measure-points' pour qu’il soit au-dessus des baseLayers
                        if (this._map.getLayer('measure-points')) {
                            this._map.moveLayer('measure-points');
                            this._map.moveLayer('measure-lines');
                        }
                    }
                }
            });
        }
    }
}
