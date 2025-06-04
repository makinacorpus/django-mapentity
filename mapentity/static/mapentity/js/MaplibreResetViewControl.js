class MaplibreResetViewControl {
    constructor(bounds) {
        this._bounds = bounds; // Les limites de la carte
        this._map = null;
        this._container = null;
    }

    onAdd(map) {
        this._map = map; // faire attention : référence à la carte et pas instance de MaplibreMap qui lui possède une référence à la carte
        // Créer le conteneur principal
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-resetview';

        // Bouton pour réinitialiser la carte
        const button = document.createElement('button');
        button.className = 'maplibregl-ctrl-icon maplibregl-resetview';
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/reset-view.png';
        img.alt = 'Reset View';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this._container.appendChild(button);

        // Ajouter l'événement de clic pour réinitialiser la carte
        button.onclick = () => this.reset()

        return this._container;
    }

    reset() {
        if (!this._bounds) {
            console.warn('No bounds set for reset view control.');
            return;
        }

        if (!this._map) {
            console.warn('Map instance is not set for reset view control.');
            return;
        }

        // Réinitialiser la vue de la carte aux limites définies
        this._map.fitBounds(this._bounds, { padding: 0 });
    }

    getBounds() {
        return this._bounds;
    }
}
