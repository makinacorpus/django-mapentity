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
        button.setAttribute('type', 'button');
        button.setAttribute('title', 'contrôleur des couches');
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
        console.log('Populating base layers...');
        const layers = this.objectsLayer.getLayers();
        const radioGroupName = 'baseLayer';

        // Obtenir les entrées des baseLayers
        const baseLayerEntries = Object.entries(layers.baseLayers);

        // Variable pour stocker la première couche
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

            // Stocker la référence de la première couche
            if (index === 0) {
                firstLayerId = id;
                firstInput = input;
            }

            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                    // Cacher tous les autres baseLayers
                    Object.values(layers.baseLayers).forEach(layerId => {
                        this.objectsLayer.toggleLayer(layerId, false);
                    });
                    // Montrer le baseLayer sélectionné
                    this.objectsLayer.toggleLayer(id, true);

                    // S'assurer que mesure est au-dessus de tous les autres
                    if (this._map.getLayer('measure-points')) {
                        this._map.moveLayer('measure-points');
                        this._map.moveLayer('measure-lines');
                    }
                }
            });
        }

        // Sélectionner automatiquement la première couche de base
        if (firstLayerId && firstInput) {
            // Marquer le premier radio button comme sélectionné
            firstInput.checked = true;

            // Cacher toutes les couches de base d'abord
            Object.values(layers.baseLayers).forEach(layerId => {
                this.objectsLayer.toggleLayer(layerId, false);
            });

            // Activer la première couche
            this.objectsLayer.toggleLayer(firstLayerId, true);

            // S'assurer que mesure est au-dessus
            if (this._map.getLayer('measure-points')) {
                this._map.moveLayer('measure-points');
                this._map.moveLayer('measure-lines');
            }

            // Déclencher un événement personnalisé pour signaler la sélection par défaut
            this._map.fire('baseLayerSelected', {
                layerId: firstLayerId,
                isDefault: true
            });
        }
    }

    _populateOverlays(container) {
        const layers = this.objectsLayer.getLayers();

        // Nettoyer les overlays existants (garder seulement les base layers + hr)
        const existingHr = container.querySelector('hr');
        if (existingHr) {
            // Supprimer tout ce qui suit le hr
            let nextElement = existingHr.nextElementSibling;
            while (nextElement) {
                const toRemove = nextElement;
                nextElement = nextElement.nextElementSibling;
                toRemove.remove();
            }
        } else {
            // Ajouter le hr s'il n'existe pas
            const hr = document.createElement('hr');
            hr.style.margin = '0';
            container.appendChild(hr);
        }

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
            input.name = "overlaysLayer";
            input.dataset.layerId = category;
            label.appendChild(input);
            label.append(` ${category}`);
            container.appendChild(label);
            container.appendChild(document.createElement('br'));

            input.addEventListener('change', (e) => {
                const isChecked = e.target.checked;

                for (const [name, id] of Object.entries(group)) {
                    this.objectsLayer.toggleLayer(id, isChecked);

                    if (isChecked) {
                        // Place l'overlay juste avant 'measure-points' pour qu'il soit au-dessus des baseLayers
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