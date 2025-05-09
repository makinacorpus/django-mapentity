class MaplibreMeasureDistanceDisplay {
    constructor() {
        this._container = null;
    }

        createContainer() {
        this._container = document.createElement('div');
        this._container.style.position = 'absolute';
        this._container.style.top = '10px';
        this._container.style.left = '60px';
        this._container.style.background = 'rgba(0, 0, 0, 0.7)'; // Fond noir transparent
        this._container.style.padding = '10px';
        this._container.style.zIndex = 1000;
        this._container.style.borderRadius = '5px'; // Coins arrondis
        return this._container;
    }

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
