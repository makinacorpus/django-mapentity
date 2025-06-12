class MaplibreGeometrySnap {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            snapDistance: 15, // pixels
            snapVertices: true,
            ...options
        };
        this._markers = [];
        this._guideSources = []; // array of source IDs
        this._buffer = this._computeBuffer();

        this.map.on('zoomend', () => {
            this._buffer = this._computeBuffer();
        });
    }

    _computeBuffer = () => {
        const p1 = this.map.project([0, 0]);
        const p2 = this.map.project([this.options.snapDistance, 0]);
        return Math.abs(p1.x - p2.x);
    };

    watchMarker = (marker) => {
        if (!this._markers.includes(marker)) {
            this._markers.push(marker);
        }

        marker.getElement().addEventListener('mousedown', () => {
            const onMove = (e) => {
                const lngLat = this.map.unproject([e.clientX, e.clientY]);
                const snapped = this._snapToGuides(lngLat);
                marker.setLngLat(snapped || lngLat);
            };

            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    };

    addGuideSource = (sourceId) => {
        if (!this._guideSources.includes(sourceId)) {
            this._guideSources.push(sourceId);
        }
    };

    _snapToGuides = (lngLat) => {
        let snapPoints = [];

        this._guideSources.forEach(sourceId => {
            const source = this.map.getSource(sourceId);
            if (!source || !source._data) return;

            const features = source._data.features;
            features.forEach(feature => {
                const geom = feature.geometry;
                if (geom.type === 'Point') {
                    snapPoints.push(geom.coordinates);
                } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
                    snapPoints.push(...geom.coordinates);
                } else if (geom.type === 'Polygon') {
                    geom.coordinates.forEach(ring => snapPoints.push(...ring));
                }
            });
        });

        const pixel = this.map.project(lngLat);
        let closest = null;
        let minDist = Infinity;

        snapPoints.forEach(coord => {
            const projected = this.map.project(coord);
            const dist = Math.hypot(projected.x - pixel.x, projected.y - pixel.y);
            if (dist < this._buffer && dist < minDist) {
                minDist = dist;
                closest = coord;
            }
        });

        return closest || null;
    };
}
