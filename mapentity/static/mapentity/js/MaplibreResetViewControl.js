class MaplibreResetViewControl {
    constructor(bounds) {
        this.bounds = bounds; // Les limites de la carte
        this.map = null;
        this.container = null;
    }

    onAdd(map) {
        this.map = map; // faire attention : référence à la carte et pas instance de MaplibreMap qui lui possède une référence à la carte
        // Créer le conteneur principal
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-resetview';

        // Bouton pour réinitialiser la carte
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', 'Réinitialiser la vue');
        button.className = 'maplibregl-ctrl-icon maplibregl-resetview';
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/reset-view.png';
        img.alt = 'Reset View';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this.container.appendChild(button);

        // Ajouter l'événement de clic pour réinitialiser la carte
        button.onclick = () => this.reset()

        return this.container;
    }

    reset() {
        if (!this.bounds) {
            console.warn('No bounds set for reset view control.');
            return;
        }

        if (!this.map) {
            console.warn('Map instance is not set for reset view control.');
            return;
        }

        this.map.fitBounds(this.bounds, {maxZoom: 16, padding: 0 });

    }

    getBounds() {
        return this.bounds;
    }
}
