class MaplibreFileLayerControl {
    static TITLE = 'Load local file (GPX, KML, GeoJSON)';
    static LABEL = '&#8965;';

    constructor(options = {}) {
        this.options = {
            position: 'top-left',
            ...options
        };
        this.loader = null;
        this._container = null;
    }

    onAdd(map) {
        console.log('Adding MaplibreFileLayerControl to map:', map); // Log the map instance
        this.loader = new MaplibreFileLoader(map, { layerOptions: this.options.layerOptions });

        // Initialize Drag-and-drop
        this._initDragAndDrop(map);

        // Initialize map control
        return this.initContainer(map);
    }

    _initDragAndDrop(map) {
        const fileLoader = this.loader;
        const dropbox = map.getContainer();

        const callbacks = {
            dragenter: () => {
                map.scrollZoom.disable();
            },
            dragleave: () => {
                map.scrollZoom.enable();
            },
            dragover: (e) => {
                e.stopPropagation();
                e.preventDefault();
            },
            drop: (e) => {
                e.stopPropagation();
                e.preventDefault();

                const files = Array.prototype.slice.call(e.dataTransfer.files);
                let i = files.length;
                const loadNextFile = () => {
                    const file = files.shift();
                    fileLoader.load(file);
                    if (files.length > 0) {
                        setTimeout(loadNextFile, 25);
                    }
                };
                setTimeout(loadNextFile, 25);
                map.scrollZoom.enable();
            }
        };
        for (const name in callbacks) {
            dropbox.addEventListener(name, callbacks[name], false);
        }
    }


    initContainer(map) {
        // Create the container for the control
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-filelayerload';

        // Create a button for the control
        const button = document.createElement('button');
        button.className = 'maplibregl-ctrl-icon maplibregl-filelayerload';
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/dossier.png'; // Assurez-vous que le chemin est correct
        img.alt = 'Load File';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this._container.appendChild(button);

        // Create an invisible file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.gpx,.kml,.geojson';
        fileInput.style.display = 'none';

        // Load on file change
        const fileLoader = this.loader;
        fileInput.addEventListener("change", function (e) {
            fileLoader.load(this.files[0]);
        }, false);

        // Bind click on hidden file input to the button
        button.onclick = () => fileInput.click();

        this._container.appendChild(fileInput);

        return this._container;
    }
}