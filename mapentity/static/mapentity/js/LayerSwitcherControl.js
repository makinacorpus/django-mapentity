class LayerSwitcherControl {
    constructor(mapInstance) {
        this.mapInstance = mapInstance;
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
        img.style.width = '20px';
        img.style.height = '20px';
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
        this._populateMenu(menu);

        // Toggle affichage menu
        button.addEventListener('click', () => {
            menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
            img.style.visibility = (menu.style.display === 'none') ? 'visible' : 'hidden'; // Masquer l'icône lorsque le menu est ouvert
        });

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!this._container.contains(e.target)) {
                menu.style.display = 'none';
                img.style.visibility = 'visible'; // Rendre l'icône visible lorsque le menu est fermé
            }
        });

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    _populateMenu(container) {
        const layers = this.mapInstance.getLayers();

        const createSection = (title) => {
            const section = document.createElement('div');
            if (title) {
                const h4 = document.createElement('h4');
                h4.textContent = title;
                section.appendChild(h4);
            }
            return section;
        };

        // Base Layers
        const baseSection = createSection('Base Layers');
        for (const [name, id] of Object.entries(layers.baseLayers)) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = false;
            input.dataset.layerId = id;
            label.appendChild(input);
            label.append(` ${name}`);
            baseSection.appendChild(label);
            baseSection.appendChild(document.createElement('br'));
        }
        container.appendChild(baseSection);

        // Ligne horizontale pour séparer les sections
        const hr = document.createElement('hr');
        container.appendChild(hr);

        // Overlays
        const overlaySection = createSection('Overlays');
        for (const [category, group] of Object.entries(layers.overlays)) {
            const catTitle = document.createElement('strong');
            catTitle.textContent = category;
            overlaySection.appendChild(catTitle);
            overlaySection.appendChild(document.createElement('br'));

            for (const [name, id] of Object.entries(group)) {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = true;
                input.dataset.layerId = id;
                label.appendChild(input);
                label.append(` ${name}`);
                overlaySection.appendChild(label);
                overlaySection.appendChild(document.createElement('br'));
            }
        }
        container.appendChild(overlaySection);

        // Gérer toggle
        container.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                const layerId = e.target.dataset.layerId;
                this.mapInstance.toggleLayer(layerId, e.target.checked);
            }
        });
    }
}
