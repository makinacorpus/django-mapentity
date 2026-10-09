class MaplibreRectangle {
    /**
     * Class representing a rectangle on a Maplibre map.
     * @param bounds {Array} - An array containing the coordinates of the rectangle's corners, in the format [[swLng, swLat], [neLng, neLat]].
     * @param options {Object} - An options object for configuring the rectangle, for example to define styles or additional properties.
     */
    constructor(bounds, options= {}) {
        this.bounds = bounds;
        this.options = options;
        this.coordinates = this._boundsToCoordinates(bounds);
    }

    /**
     * Defines the rectangle bounds.
     * @param bounds {Array} - An array containing the coordinates of the rectangle corners, in the form [[swLng, swLat], [neLng, neLat]].
     * @returns {*[][]} - An array containing the coordinates of the rectangle corners in the form [[swLng, swLat], [neLng, neLat]].
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
            [sw[0], sw[1]]  // close polygon
        ];
    }

    /**
     * Retrieves the coordinates of the rectangle as GeoJSON.
     * @returns {string} - The coordinates of the rectangle in WKT (Well-Known Text) format.
     */
    getWKT() {
        // Use the getWKT function to retrieve the coordinates in WKT format
        return getWKT({
            type: 'Polygon',
            coordinates: [this.coordinates]
        })
    }
}