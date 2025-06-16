class MaplibreFileLayerControl {
    constructor(options = {}) {
        this.options = {
            position: 'top-left',
            ...options
        };
        this.loader = null;
        this._container = null;
    }

    onAdd(map) {
        this.loader = new MaplibreFileLoader(map, { layerOptions: this.options.layerOptions });

        // Initialisation du Drag-and-drop
        this._initDragAndDrop(map);

        // Initialisation du conteneur
        return this.initContainer(map);
    }

    // Initialisation du drag and drop
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
        // Creation du conteneur principal
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-filelayerload';

        // Création du bouton pour charger un fichier
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', 'charger un fichier local (GPX, KML, GeoJSON)');
        button.className = 'maplibregl-ctrl-icon maplibregl-filelayerload';
        const img = document.createElement('img');
        img.src = '/static/mapentity/images/dossier.png'; // Assurez-vous que le chemin est correct
        img.alt = 'Load File';
        img.style.width = '25px';
        img.style.height = '25px';
        img.style.padding = '2px';
        button.appendChild(img);
        this._container.appendChild(button);

        // Création de l'input de type file
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.gpx,.kml,.geojson';
        fileInput.style.display = 'none';

        // chargement du fichier lors d'un upload
        const fileLoader = this.loader;
        fileInput.addEventListener("change", function (e) {
            fileLoader.load(this.files[0]);
        }, false);

        // Ajout de l'événement de clic pour charger le fichier
        button.onclick = () => fileInput.click();

        this._container.appendChild(fileInput);

        return this._container;
    }
}