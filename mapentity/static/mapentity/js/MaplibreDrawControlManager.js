class MaplibreDrawControlManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {...options};
        this.draw = null;
        this._container = null;
        this.onModeChange = null; // Callback pour notifier le changement de mode
        this._initializeDraw();
        this._addCustomControls();
    }

    _initializeDraw() {
        const drawOptions = {
            displayControlsDefault: false,
            controls: {
                point: false,
                line_string: false,
                polygon: false,
                trash: false
            }
        };

        this.draw = new MapboxDraw(drawOptions);
        this.map.addControl(this.draw, 'top-left');
    }

    _addCustomControls() {
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const createButton = (src, alt, title, mode) => {
            const button = document.createElement('button');
            button.setAttribute('type', 'button');
            button.setAttribute('title', title);
            button.className = 'maplibregl-ctrl-icon';

            const img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            img.style.width = '25px';
            img.style.height = '25px';
            img.style.padding = '2px';

            button.appendChild(img);
            button.onclick = () => {
                // Vérifier si on est déjà dans le mode demandé
                const currentMode = this.draw.getMode();
                if (currentMode === mode) {
                    console.log(`Already in ${mode} mode, ignoring click`);
                    return;
                }

                this.draw.changeMode(mode);
                // Notifier le changement de mode
                if (this.onModeChange) {
                    this.onModeChange(mode);
                }
            };

            return button;
        };

        if(this.options.isGeneric){
            this.options.isPoint= true;
            this.options.isLineString = true;
            this.options.isPolygon = true;
        }

        if (this.options.isPoint) {
            const pointBtn = createButton(
                '/static/mapentity/images/draw-point.png',
                'Draw Point',
                'Dessiner un point',
                'draw_point'
            );
            this._container.appendChild(pointBtn);
        }

        if (this.options.isLineString) {
            const lineBtn = createButton(
                '/static/mapentity/images/draw-line.png',
                'Draw Line',
                'Dessiner une ligne',
                'draw_line_string'
            );
            this._container.appendChild(lineBtn);
        }

        if (this.options.isPolygon) {
            const polyBtn = createButton(
                '/static/mapentity/images/draw-polygon.png',
                'Draw Polygon',
                'Dessiner un polygone',
                'draw_polygon'
            );
            this._container.appendChild(polyBtn);
        }

        if(this.options.isLineString || this.options.isPolygon) {
            const editBtn = createButton(
                '/static/mapentity/images/edit.png',
                'Edit Feature',
                'Modifier la géométrie',
                'simple_select'
            );
            editBtn.onclick = () => {
                const selected = this.draw.getSelectedIds();
                if (selected.length > 0) {
                    this.draw.changeMode('direct_select', { featureId: selected[0] });
                } else {
                    console.warn('No feature selected for editing');
                }
                // Notifier le changement de mode
                if (this.onModeChange) {
                    this.onModeChange('direct_select');
                }
            };
            this._container.appendChild(editBtn);

        }

        if (this.options.modifiable) {
            const trashBtn = createButton(
                '/static/mapentity/images/delete.png',
                'Delete Feature',
                'Supprimer',
                'simple_select'
            );
            trashBtn.onclick = () => {
                const selected = this.draw.getSelectedIds();
                console.log('Selected features to delete:', selected);
                if (selected.length > 0) {
                    this.draw.delete(selected);
                    this.map.fire('custom.draw.delete', { deletedFeatures: selected });
                }
            };
            this._container.appendChild(trashBtn);
        }

        this.map.addControl({
            onAdd: () => this._container,
            onRemove: () => {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            }
        }, 'top-left');
    }

    getDraw() {
        return this.draw;
    }

    // Méthode pour définir le callback
    setOnModeChange(callback) {
        this.onModeChange = callback;
    }
}