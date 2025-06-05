// Gestionnaire simplifié pour MapBox GL Draw
class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = options;
        this.draw = null;
        this._initializeDraw();
    }

    _initializeDraw() {
        const drawOptions = {
            displayControlsDefault: false,
            controls: {
                point: this.options.isPoint,
                line_string: this.options.isLineString,
                polygon: this.options.isPolygon,
                trash: this.options.modifiable
            }
        };

        this.draw = new MapboxDraw(drawOptions);
        this.map.addControl(this.draw);
    }

    getAll() {
        return this.draw.getAll();
    }

    set(featureCollection) {
        return this.draw.set(featureCollection);
    }

    deleteAll() {
        return this.draw.deleteAll();
    }
}