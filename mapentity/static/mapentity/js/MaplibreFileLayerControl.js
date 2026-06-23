class MaplibreFileLayerControl {
    /**
     * Constructor of the MaplibreFileLayerControl class.
     * @param options {Object} - Configuration options for the file loading control.
     */
    constructor(options = {}) {
        this.options = { ...options };
        this._map = null;
        this._container = null;

        this._popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        this._parsers = {
            'geojson': this._loadGeoJSON.bind(this),
            'gpx': this._convertToGeoJSON.bind(this),
            'kml': this._convertToGeoJSON.bind(this)
        };
    }

    /**
     * Method called when adding the control to the map.
     * @param map {maplibregl.Map} - The Maplibre map instance.
     * @returns {HTMLElement} - The control's container.
     */
    onAdd(map) {
        this._map = map;
        this._initDragAndDrop(map);
        return this._initContainer(map);
    }

    /**
     * Loads a file into the Maplibre map.
     * @param file {File} - The file to load, which must be a valid File object.
     */
    load(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const parser = this._parsers[ext];
        if (!parser) {
            window.alert("Unsupported file type " + file.type + ' (' + ext + ')');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            parser(e.target.result, ext);
        };
        reader.readAsText(file);
    }

    /**
     * Initialize the drag and drop to load files into the map.
     * @param map {maplibregl.Map} - The Maplibre map instance.
     * @private
     */
    _initDragAndDrop(map) {
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
                const loadNextFile = () => {
                    const file = files.shift();
                    this.load(file);
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

    /**
     * Initialise the main container for the file upload control.
     * @param map {maplibregl.Map} - The Maplibre map instance.
     * @returns {HTMLElement} - Returns the main container for the control.
     * @private
     */
    _initContainer(map) {
        // Création du conteneur principal
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-filelayerload';

        // Création du bouton pour charger un fichier
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('title', gettext('Upload a local file (GPX, KML, GeoJSON)'));
        button.className = 'maplibregl-ctrl-icon maplibregl-filelayerload';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/dossier.png';
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

        // Chargement du fichier lors d'un upload
        fileInput.addEventListener("change", (e) => {
            if (e.target.files[0]) {
                this.load(e.target.files[0]);
            }
        }, false);

        // Ajout de l'événement de clic pour charger le fichier
        button.onclick = () => fileInput.click();

        this._container.appendChild(fileInput);

        return this._container;
    }

    /**
     * Load GeoJSON content into the Maplibre map.
     * @param content {Object|string} - The GeoJSON content to load, which can be a JSON string or an object.
     * @private
     */
    _loadGeoJSON(content) {
        if (typeof content === 'string') {
            content = JSON.parse(content);
        }

        const sourceId = `source-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        this._map.addSource(sourceId, {
            type: 'geojson',
            data: content
        });

        if (content.features) {
            // Utiliser les options définies ou valeurs par défaut
            const style = this.options.style || {};
            const color = style.color || '#B42222';
            const fillOpacity = style.fillOpacity ?? 0.7;
            const strokeOpacity = style.opacity ?? 1.0;
            const strokeWidth = style.weight ?? 2;
            const circleRadius = style.radius ?? 6;

            this._addLayerWithPopup('polygon', 'fill', sourceId, {
                color,
                opacity: fillOpacity
            }, ['==', '$type', 'Polygon']);

            this._addLayerWithPopup('point', 'circle', sourceId, {
                color,
                radius: circleRadius
            }, ['==', '$type', 'Point']);

            this._addLayerWithPopup('line', 'line', sourceId, {
                color,
                opacity: strokeOpacity,
                width: strokeWidth
            }, ['==', '$type', 'LineString']);

            const bounds = calculateBounds(content);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
            }
        }
    }

    /**
     * Adds a layer with a popup to the Maplibre map.
     * @param type {string} - The type of the layer (e.g., 'polygon', 'point', 'line').
     * @param layerType {string} - The type of the Maplibre layer (e.g., 'fill', 'circle', 'line').
     * @param sourceId {string} - The ID of the GeoJSON source to use for the layer.
     * @param style {Object} - An object containing styles for the layer, such as 'color', 'opacity', 'radius', etc.
     * @param filter {Array} - An array of filters for the layer, for example ['==', '$type', 'Polygon'].
     * @private
     */
    _addLayerWithPopup(type, layerType, sourceId, style, filter) {
        const layerId = `${type}-layer-${sourceId}`;

        let paint;
        if (layerType === 'fill') {
            paint = {
                'fill-color': style.color,
                'fill-opacity': style.opacity
            };
        } else if (layerType === 'circle') {
            paint = {
                'circle-radius': style.radius,
                'circle-color': style.color
            };
        } else if (layerType === 'line') {
            paint = {
                'line-color': style.color,
                'line-opacity': style.opacity,
                'line-width': style.width
            };
        }

        this._map.addLayer({
            id: layerId,
            type: layerType,
            source: sourceId,
            paint: paint,
            filter: filter
        });

        // Ajouter popup
        this._map.on('mouseenter', layerId, (e) => {
            this._map.getCanvas().style.cursor = 'pointer';
            const coordinates = e.lngLat;
            const properties = e.features[0].properties;
            const content = Object.entries(properties)
                .map(([key, value]) => `<strong>${key}</strong>: ${value}`)
                .join('<br>');

            this._popup.setLngLat(coordinates)
                .setHTML(content || 'Aucune donnée')
                .addTo(this._map);
        });

        this._map.on('mouseleave', layerId, () => {
            this._map.getCanvas().style.cursor = '';
            this._popup.remove();
        });
    }

    /**
     * Converts the content of a file to GeoJSON.
     * @param content {string|Document} - The file content, which can be an XML string or an XML document.
     * @param format {string} - The file format (e.g., 'gpx', 'kml').
     * @private
     */
    _convertToGeoJSON(content, format) {
        if (typeof content === 'string') {
            content = (new window.DOMParser()).parseFromString(content, "text/xml");
        }
        const geojson = toGeoJSON[format](content);
        return this._loadGeoJSON(geojson);
    }
}