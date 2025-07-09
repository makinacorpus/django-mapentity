class MaplibreMeasureDistanceDisplay {
    /**
     * Classe pour afficher la distance totale mesurée sur une carte MapLibre.
     */
    constructor() {
        this._container = null;
    }

    /**
     * Crée le conteneur pour afficher la distance mesurée.
     * @returns {null} - Retourne le conteneur créé.
     */
    createContainer() {
        this._container = document.createElement('div');
        this._container.style.position = 'absolute';
        this._container.style.top = '10px';
        this._container.style.left = '60px';
        this._container.style.background = 'rgba(0, 0, 0, 0.7)';
        this._container.style.padding = '10px';
        this._container.style.zIndex = 1000;
        this._container.style.borderRadius = '5px';
        return this._container;
    }

    /**
     * Met à jour l'affichage de la distance totale mesurée.
     * @param distance {number} - La distance totale mesurée en kilomètres.
     */
    updateDistance(distance) {
        if (this._container) {
            this._container.innerHTML = '';
            const value = document.createElement('pre');
            value.textContent = `Total distance: ${distance.toLocaleString()} km`;
            value.style.color = 'white';
            this._container.appendChild(value);
        }
    }
}
