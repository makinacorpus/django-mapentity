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
        img.src = '/static/mapentity/images/layers-2x.png'; // mets le chemin de ton icône ici
        img.alt = 'Couches';
        img.style.width = '25px';
        img.style.height = '25px';
        button.appendChild(img);
        this._container.appendChild(button);

        // Dropdown menu
        const menu = document.createElement('div');
        menu.className = 'layer-switcher-menu';
        menu.style.display = 'none'; // masqué par défaut
        menu.style.width = '200px'; // Augmenter la largeur du menu
        menu.style.padding = '5px'; // Ajouter du padding pour plus d'espace
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
        this._map.on('layers:added', (e) => {
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

        // Base Layers
        for (const [name, id] of Object.entries(layers.baseLayers)) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = false;
            input.dataset.layerId = id;
            label.appendChild(input);
            label.append(` ${name}`);
            container.appendChild(label);
            container.appendChild(document.createElement('br'));

            // Add event listener to toggle the base layer
            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                this.objectsLayer.toggleLayer(id, isChecked);
                console.log(`Base Layer ${id} toggled: ${isChecked}`);
                this._map.moveLayer(id, 'measure-points');
            });
        }
    }

    _populateOverlays(container) {
        const layers = this.objectsLayer.getLayers();

        // Ligne horizontale pour séparer les sections
        const hr = document.createElement('hr');
        hr.style.margin = 0;
        container.appendChild(hr);

        // Overlays
        for (const [category, group] of Object.entries(layers.overlays)) {
            // Display category name prominently
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

            // Add event listener to toggle all layers in the category
            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                for (const [name, id] of Object.entries(group)) {
                    this.objectsLayer.toggleLayer(id, isChecked);
                    console.log(`Layer ${id} toggled: ${isChecked}`);
                    this._map.moveLayer(id, 'measure-points');
                }
            });
        }
    }
}
