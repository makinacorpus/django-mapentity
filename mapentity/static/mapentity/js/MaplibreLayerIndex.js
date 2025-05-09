// import RTree from '/static/mapentity/js/rtree.js';

class MaplibreLayerIndex {
    constructor(options = {}) {
        this.options = options;
        this._rtree = null;
    }

    search(bounds) {
        const rtbounds = this._rtbounds(bounds);
        return this._rtree ? this._rtree.search(rtbounds) : [];
    }

    searchBuffer(latlng, radius) {
        /* Caution: radius is in degrees */
        const around = new maplibregl.LngLatBounds([
            [latlng.lng - radius, latlng.lat - radius],
            [latlng.lng + radius, latlng.lat + radius]
        ]);
        return this.search(around);
    }

    indexLayer(layer) {
        if (this.options.indexing !== undefined && !this.options.indexing) return;

        const bounds = this._layerBounds(layer);

        if (!this._rtree) this._rtree = new RTree();
        this._rtree.insert({
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth(),
            layer
        });
    }

    unindexLayer(bounds, layer) {
        /* If layer is not provided, does wide-area remove */
        this._rtree.remove({
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth(),
            layer
        }, (a, b) => a.layer === b.layer);
    }

    _layerBounds(layer) {
        // Introspects layer and returns its bounds.
        let bounds = null;
        if (layer.geometry.type === 'Polygon') {
            bounds = new maplibregl.LngLatBounds();
            layer.geometry.coordinates[0].forEach(coord => {
                bounds.extend([coord[0], coord[1]]);
            });
        } else if (layer.geometry.type === 'Point') {
            bounds = new maplibregl.LngLatBounds([layer.geometry.coordinates[0], layer.geometry.coordinates[1]], [layer.geometry.coordinates[0], layer.geometry.coordinates[1]]);
        }

        if (!(bounds && bounds.isValid())) {
            throw new Error("Unable to get layer bounds");
        }

        return bounds;
    }

    _rtbounds(bounds) {
        return {
            minX: bounds.getWest(),
            minY: bounds.getSouth(),
            maxX: bounds.getEast(),
            maxY: bounds.getNorth()
        };
    }
}

