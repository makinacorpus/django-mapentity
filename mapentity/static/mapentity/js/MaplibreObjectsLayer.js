class MaplibreObjectsLayer {
    constructor(geojson, options) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.options = { ...options };
        this.currentPopup = null;
        this.layers = {
            baseLayers: {},
            overlays: {}
        };
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
            if (this.options.objectUrl) {
                window.location = this.options.objectUrl(feature.properties, feature);
            }
        }
    }

    _onMouseMove(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: Object.values(this._current_objects)
        });

        // Reset hover state for all features
        Object.keys(this._current_objects).forEach(primaryKey => {
            this.highlight(primaryKey, false);
        });

        if (features.length > 0) {
            this._map.getCanvas().style.cursor = 'pointer'; // Change cursor to pointer
            const feature = features[0];
            const primaryKey = this.getPrimaryKey(feature);
            this.highlight(primaryKey, true);

            // Supprimer le popup précédent s'il existe
            if (this.currentPopup) {
                this.currentPopup.remove();
                this.currentPopup = null;
            }

            const coordinates = feature.geometry.type === 'Point'
                ? feature.geometry.coordinates
                : turf.centroid(feature).geometry.coordinates;

            const description = feature.properties.name || 'No data available';

            this.currentPopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup'
            })
                .setLngLat(coordinates)
                .setHTML(`<div class="popup-content">${description}</div>`)
                .addTo(this._map);

        } else {
            // Si aucune feature n'est survolée, supprimer le popup et remettre le curseur par défaut
            this._map.getCanvas().style.cursor = '';
            if (this.currentPopup) {
                this.currentPopup.remove();
                this.currentPopup = null;
            }
        }
    }


    async load(url) {
        console.log("Loading data from URL: " + url);
        this.loading = true;
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.addData(data);
            this._map.fire('layers:added', { layers: this.getLayers() }); // Émettre un événement lorsque de nouvelles couches sont ajoutées
        } catch (error) {
            console.error("Could not load url '" + url + "'", error);
        }
    }


    addData(geojson) {
        geojson.features.forEach(feature => {
            this.addLayer(feature);
            this._mapObjects(feature);
        });
    }
     _mapObjects(feature) {
        const pk = this.getPrimaryKey(feature);
        this._objects[pk] = feature;
        // this._current_objects[pk] = feature;
        feature.properties = feature.properties || {};
    }

    highlight(primaryKey, on = true) {
        if (primaryKey && this._current_objects[primaryKey]) {
            const layerId = this._current_objects[primaryKey];
            const sourceId = layerId.replace(/^layer-/, 'source-');
            const source = this._map.getSource(sourceId);
            if (source && source._data) {
                const featureId = this.getPrimaryKey(source._data);
                // Set the hover state for the feature
                this._map.setFeatureState(
                    { source: sourceId, id: featureId },
                    { hover: on }
                );
            }
        }
    }

    select(primaryKey, on = true) {
        this.highlight(primaryKey, on);
    }

    addLayer(feature, categoryName = null) {
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
        // dans current_objects on va stocker le layerId
        this._current_objects[primaryKey] = layerId;

        // Si la couche est déjà présente, on ne l'ajoute pas
        const category = categoryName || this.options.modelname;
        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }
        this.layers.overlays[category][primaryKey] = layerId;
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
        console.log('objects', this._objects);
        console.log('primaryKey', primaryKey);
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
        this._map.fire('layers:added', { layers: this.getLayers() }); // Émettre un événement lorsque de nouvelles couches sont ajoutées
    }

    // Fit the map to the bounds of the layer we clicked on
    jumpTo(pk) {
        const layer = this.getLayer(pk);
        console.log('jumpTo', layer);
        if (layer) {
            const bounds = this.calculateBounds(layer);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 50 });
            }
        }
    }

    calculateBounds(geojson) {
        if (!geojson) return null;

        const bounds = new maplibregl.LngLatBounds();

        // Handle single feature
        if (geojson.geometry) {
            const coords = geojson.geometry.coordinates;
            const type = geojson.geometry.type;

            if (!coords || !type) return null;

            let flattened = [];

            switch (type) {
                case 'Point':
                    flattened = [coords];
                    break;
                case 'MultiPoint':
                case 'LineString':
                    flattened = coords;
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    flattened = coords.flat();
                    break;
                case 'MultiPolygon':
                    flattened = coords.flat(2);
                    break;
                default:
                    return null;
            }

            flattened.forEach(coord => bounds.extend(coord));
        } else if (geojson.features) {
            // Handle multiple features
            geojson.features.forEach(feature => {
                const coords = feature.geometry?.coordinates;
                const type = feature.geometry?.type;
                if (!coords || !type) return;

                let flattened = [];

                switch (type) {
                    case 'Point':
                        flattened = [coords];
                        break;
                    case 'MultiPoint':
                    case 'LineString':
                        flattened = coords;
                        break;
                    case 'Polygon':
                    case 'MultiLineString':
                        flattened = coords.flat();
                        break;
                    case 'MultiPolygon':
                        flattened = coords.flat(2);
                        break;
                    default:
                        return;
                }

                flattened.forEach(coord => bounds.extend(coord));
            });
        }

        return bounds.isEmpty() ? null : bounds;
    }
}
