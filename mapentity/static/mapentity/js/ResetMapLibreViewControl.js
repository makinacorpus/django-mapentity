class ResetMapLibreViewControl {
    constructor(bounds) {
        this._bounds = bounds;
        this._map = null;
        this._container = null;
    }

     onAdd(map) {
        this.map = map;

        const container = document.createElement('button');
        container.className = 'maplibregl-ctrl-icon maplibregl-resetview';
        container.type = 'button';
        container.title = 'Réinitialiser la vue';

        container.onclick = () => this.reset();

        const wrapper = document.createElement('div');
        wrapper.className = 'maplibregl-ctrl-group maplibregl-ctrl';
        wrapper.appendChild(container);

        return wrapper;
    }

    onRemove(){
        if(this._container && this._container.parentNode){
            this._container.parentNode.removeChild(this._container);
        }
        this._map = null;
    }

    reset() {
        if (this.map && this.bounds) {
            this.map.fitBounds(this.bounds, { padding: 20 });
        }
    }

    getBounds(){
        return this._bounds;
    }
}