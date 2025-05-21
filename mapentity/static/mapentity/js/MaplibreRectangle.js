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
        // Convert bounds to an array of coordinates representing the rectangle
        const sw = bounds[0]; // Southwest corner
        const ne = bounds[1]; // Northeast corner

        return [
            [sw[0], sw[1]], // Southwest
            [sw[0], ne[1]], // Northwest
            [ne[0], ne[1]], // Northeast
            [ne[0], sw[1]], // Southeast
            [sw[0], sw[1]]  // Close the polygon
        ];
    }

    getWKT() {
        // Use the getWKT function to get the WKT representation of rectangle
        return getWKT({
            type: 'Polygon',
            coordinates: [this.coordinates]
        })
    }
}