class MaplibreResetViewControl {
    /**
     * Contrôle pour réinitialiser la vue de la carte à ses limites initiales.
     * @param {Object} bounds - Les limites de la carte sous forme de [SW, NE] (sud-ouest, nord-est).
     */
    constructor(bounds) {
        this.bounds = bounds;
        this.map = null;
        this.container = null;
    }

    /**
     * Ajoute le contrôle à la carte.
     * @param map {maplibregl.Map} - L'instance de la carte Maplibre à laquelle ajouter le contrôle.
     * @returns {null} - Retourne le conteneur principal du contrôle.
     */
    onAdd(map) {
        this.map = map;
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

        button.onclick = () => this.reset()

        return this.container;
    }

    /**
     * Réinitialise la vue de la carte aux limites initiales.
     */
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

    /**
     * Récupère les limites de la carte.
     * @returns {Object} - Les limites de la carte sous forme de [SW, NE] (sud-ouest, nord-est).
     */
    getBounds() {
        return this.bounds;
    }
}
