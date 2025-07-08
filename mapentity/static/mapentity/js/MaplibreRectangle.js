class MaplibreRectangle {
    /**
     * Classe représentant un rectangle sur une carte Maplibre.
     * @param bounds {Array} - Un tableau contenant les coordonnées des coins du rectangle, sous la forme [[swLng, swLat], [neLng, neLat]].
     * @param options {Object} - Un objet d'options pour configurer le rectangle, par exemple pour définir des styles ou des propriétés supplémentaires.
     */
    constructor(bounds, options= {}) {
        this.bounds = bounds;
        this.options = options;
        this.coordinates = this._boundsToCoordinates(bounds);
    }

    /**
     * Définit les limites du rectangle.
     * @param bounds {Array} - Un tableau contenant les coordonnées des coins du rectangle, sous la forme [[swLng, swLat], [neLng, neLat]].
     * @returns {*[][]} - Un tableau contenant les coordonnées des coins du rectangle sous la forme [[swLng, swLat], [neLng, neLat]].
     * @private
     */
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

    /**
     * Récupère les coordonnées du rectangle sous forme de GeoJSON.
     * @returns {string} - Les coordonnées du rectangle sous forme WKT (Well-Known Text).
     */
    getWKT() {
        // Utilisation de la fonction getWKT pour récupérer les coordonnées sous format WKT
        return getWKT({
            type: 'Polygon',
            coordinates: [this.coordinates]
        })
    }
}