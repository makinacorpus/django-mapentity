class MaplibreResetViewControl {
    /**
     * Control to reset the map view to its initial bounds.
     * @param {Object} bounds - The map bounds as [SW, NE] (southwest, northeast).
     */
    constructor(bounds) {
        this.bounds = bounds;
        this.map = null;
        this.container = null;
    }

    /**
     * Adds the control to the map.
     * @param map {maplibregl.Map} - The Maplibre map instance to which the control will be added.
     * @returns {null} - Returns the main container of the control.
     */
    onAdd(map) {
        this.map = map;
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-resetview';

        // Button to reset the map view
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', gettext('Reset view'));
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
     * Reset the map view to the initial bounds.
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
     * Retrieves the map bounds.
     * @returns {Object} - The map bounds in the form of [SW, NE] (southwest, northeast).
     */
    getBounds() {
        return this.bounds;
    }
}
