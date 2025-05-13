class MaplibreObjectsLayer {
    constructor(geojson, options) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.loading = false;
        this.options = { ...options }; // Use the spread operator to create a copy of the options object

        // gère le bind des les labels sur les couches
        this._onEachFeature = this.options.onEachFeature;
        // pointToLayer est simplement une fonction qui change le style du curseur une fois sur le layer
        this._pointToLayer = this.options.pointToLayer;

        this.layers = {
            baseLayers: {},
            overlays: {}
        };

        if (typeof geojson === 'string') {
            this.load(geojson);
        } else if (geojson) {
            this.addData(geojson);
        }
    }

    initialize(map) {
        this._map = map;
        const onClick = (e) => this._onClick(e);
        const onMouseMove = (e) => this._onMouseMove(e);
        this._map.on('click', onClick);
        this._map.on('mousemove', onMouseMove);
    }

    _onClick(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: Object.values(this._current_objects)
        });
        if (features.length > 0) {
            const feature = features[0];
            const primaryKey = this.getPrimaryKey(feature);
            console.log('Clicked feature:', primaryKey);
            if (this.options.objectUrl) {
                window.location = this.options.objectUrl(feature.properties, feature);
            }
        }
    }

    _onMouseMove(e) {
        console.log('Mouse move event:', e);
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: Object.values(this._current_objects)
        });

        // Reset hover state for all features
        Object.keys(this._current_objects).forEach(primaryKey => {
            this.highlight(primaryKey, false);
        });

        // Set hover state for the hovered feature
        if (features.length > 0) {
             this._map.getCanvas().style.cursor = 'pointer'; // Change cursor to pointer
            const feature = features[0];
            const primaryKey = this.getPrimaryKey(feature);
            console.log('Hovered feature:', primaryKey);
            this.highlight(primaryKey, true);
        } else {
            this._map.getCanvas().style.cursor = ''; // Reset cursor
        }
    }

    load(url) {
        console.log("Loading data from URL: " + url);
        this.loading = true;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.addData(data);
            })
            .catch(error => {
                console.error("Could not load url '" + url + "'", error);
            });
    }

    addData(geojson) {
        geojson.features.forEach(feature => {
            this.addLayer(feature);
        });
    }

    // ça marche
    highlight(primaryKey, on = true) {
        if (primaryKey && this._current_objects[primaryKey]) {
            const layerId = this._current_objects[primaryKey];
            const sourceId = layerId.replace(/^layer-/, 'source-');
            const source = this._map.getSource(sourceId);
            if (source && source._data) {
                const featureId = this.getPrimaryKey(source._data);
                console.log(`Setting hover state for ${primaryKey}: ${on}`);

                // Set the hover state for the feature
                console.log('sourceId:', sourceId);
                console.log('featureId:', featureId);
                this._map.setFeatureState(
                    { source: sourceId, id: featureId },
                    { hover: on }
                );
            }
        }

    }
    // ça devrait marcher reste à d'abord faire la synchronisation pour que ça le fasse
    select(primaryKey, on = true) {
        if (primaryKey && this._current_objects[primaryKey]) {
            const layerId = this._current_objects[primaryKey];
            const sourceId = layerId.replace(/^layer-/, 'source-');
            const source = this._map.getSource(sourceId);
            if (source && source._data) {
                const featureId = this.getPrimaryKey(source._data);
                console.log(`Setting select state for ${primaryKey}: ${on}`);

                // Set the select state for the feature
                this._map.setFeatureState(
                    { source: sourceId, id: featureId },
                    { select: on }
                );
            }
        }
    }


    addLayer(feature, category = null) {
        const primaryKey = this.getPrimaryKey(feature);
        const layerId = `layer-${primaryKey}`;
        const sourceId = `source-${primaryKey}`;

        feature.id = primaryKey;
        this._map.addSource(sourceId, {
            type: 'geojson',
            data: feature
        });

        const geometryType = feature.geometry.type;
        let layerConfig = {};

        if (geometryType === 'Polygon') {
            layerConfig = {
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': this.options.style.color || '#888888',
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        1,
                        0.4
                    ]
                }
            };
        } else if (geometryType === 'LineString') {
            layerConfig = {
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': this.options.style.color || '#B42222',
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        5,
                        2
                    ]
                }
            };
        } else if (geometryType === 'Point') {
            layerConfig = {
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        9,
                        6
                    ],
                    'circle-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000', // Red color for hover
                        this.options.style.color || '#B42222'
                    ]
                }
            };
        }

        this._map.addLayer(layerConfig);
        this._current_objects[primaryKey] = layerId;

        // reste à gérer ceci

        // const categoryName = category || this.options.modelname;
        // console.log('categoryName:', categoryName);
        // if (!this.layers.overlays[categoryName]) {
        //     this.layers.overlays[categoryName] = {};
        // }
        // this.layers.overlays[categoryName][primaryKey] = layerId;
        // console.log('Layers id:', this.layers.overlays[categoryName]);
        // console.log('Layers Overlays:', this.layers.overlays);
    }


    addBaseLayer(name, layerConfig) {
        const { id, tiles, tileSize = 256, attribution = '' } = layerConfig;

        this._map.addSource(id, {
            type: 'raster',
            tiles: tiles,
            tileSize,
            attribution
        });

        this._map.addLayer({
            id,
            type: 'raster',
            source: id,
            layout: { visibility: 'none' }
        });

        this.layers.baseLayers[name] = id;
    }

    removeLayer(layerId) {
        if (this._map.getLayer(layerId)) {
            this._map.removeLayer(layerId);
        }
        const sourceId = layerId.replace(/^layer-/, 'source-');
        if (this._map.getSource(sourceId)) {
            this._map.removeSource(sourceId);
        }
    }

    toggleLayer(layerId, visible = true) {
        this._map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    getLayers() {
        return this.layers;
    }

    getLayer(primaryKey) {
        return this._objects[primaryKey];
    }

    getPrimaryKey(feature) {
        return feature.properties.id || feature.id || this._generateUniqueId(feature);
    }

    _generateUniqueId(feature) {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    getCurrentLayers() {
        return this._current_objects;
    }

    // pas encore utilisée pour le moment

    // cela ne marchera pas car je ne peux pas calculer le bounds du layer et que fitbounds n'est pas dans _map
    // jumpTo(primaryKey) {
    //     const layer = this.getLayer(primaryKey);
    //     if (layer) {
    //         this._map.fitBounds(layer.getBounds());
    //     }
    // }

    updateFromPks(primaryKeys) {
        const new_objects = {};
        primaryKeys.forEach(primaryKey => {
            const layer = this._objects[primaryKey];
            if (layer) {
                new_objects[primaryKey] = layer;
                if (!this._current_objects[primaryKey]) {
                    this.addLayer(layer);
                }
            }
        });
        Object.keys(this._current_objects).forEach(primaryKey => {
            if (!new_objects[primaryKey]) {
                this.removeLayer(this._current_objects[primaryKey]);
            }
        });
        this._current_objects = new_objects;
    }
}
