class MaplibreRectangle {
    constructor(bounds, options= {}) {
        this.bounds = bounds;
        this.options = options;
        this.coordinates = this._boundsToCoordinates(bounds);
    }

    setBounds(bounds) {
        this.bounds = bounds;
        this.coordinates = this._boundsToCoordinates(bounds);
    }

    _boundsToCoordinates(bounds) {

        const sw = bounds[0]; // Southwest corner
        const ne = bounds[1]; // Northeast corner

        return [
            [sw[0], sw[1]], // Southwest
            [sw[0], ne[1]], // Northwest
            [ne[0], ne[1]], // Northeast
            [ne[0], sw[1]], // Southeast
            [sw[0], sw[1]]  // Fermeture du polygon
        ];
    }

    getWKT() {
        // Utilisation de la fonction getWKT pour récupérer les coordonnées sous format WKT
        return getWKT({
            type: 'Polygon',
            coordinates: [this.coordinates]
        })
    }
}