class MaplibreObjectsLayer {
    constructor(geojson, options) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.loading = false;
        this.options = {...options }; // Utiliser l'opérateur de décomposition pour créer une copie de l'objet options

        this._onEachFeature = this.options.onEachFeature;
        this._pointToLayer = this.options.pointToLayer;

        this.layers = {
            baseLayers: {},
            overlays: {}
        };

        this._originalStyles = {}; // Stocker les styles originaux

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
            const pk = this.getPk(feature);
            if (this.options.objectUrl) {
                window.location = this.options.objectUrl(feature.properties, feature);
            }
        }
    }

    _onMouseMove(e) {
        const features = this._map.queryRenderedFeatures(e.point, {
            layers: Object.values(this._current_objects)
        });
        if (features.length > 0) {
            const feature = features[0];
            const pk = this.getPk(feature);
            this.highlight(pk, true);
        } else {
            this.highlight(null, false);
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
            // this._mapObjects(feature);
            // if (this._onEachFeature) {
            //     this._onEachFeature(feature);
            // }
            this.addLayer(feature);
        });
    }

    // _mapObjects(feature) {
    //     const pk = this.getPk(feature);
    //     this._objects[pk] = feature;
    //     this._current_objects[pk] = feature;
    //     feature.properties = feature.properties || {};
    // }


    updateFromPks(pks) {
        const new_objects = {};
        pks.forEach(pk => {
            const layer = this._objects[pk];
            if (layer) {
                new_objects[pk] = layer;
                if (!this._current_objects[pk]) {
                    this.addLayer(layer);
                }
            }
        });
        Object.keys(this._current_objects).forEach(pk => {
            if (!new_objects[pk]) {
                this.removeLayer(this._current_objects[pk]);
            }
        });
        this._current_objects = new_objects;
    }


    highlight(pk, on = true) {
        const layerId = this._current_objects[pk];
        if (layerId) {
            const layer = this._map.getLayer(layerId);
            if (layer) {
                const type = layer.type;

                if (on) {
                    // Appliquer le style de surbrillance
                    const highlightStyle = {
                        'fill-color': 'red',
                        'fill-opacity': 1,
                        'line-color': 'red',
                        'line-width': 5,
                        'circle-color': 'red',
                        'circle-radius': 7
                    };

                    if (type === 'fill') {
                        this._map.setPaintProperty(layerId, 'fill-color', highlightStyle['fill-color']);
                        this._map.setPaintProperty(layerId, 'fill-opacity', highlightStyle['fill-opacity']);
                    } else if (type === 'line') {
                        this._map.setPaintProperty(layerId, 'line-color', highlightStyle['line-color']);
                        this._map.setPaintProperty(layerId, 'line-width', highlightStyle['line-width']);
                    } else if (type === 'circle') {
                        this._map.setPaintProperty(layerId, 'circle-color', highlightStyle['circle-color']);
                        this._map.setPaintProperty(layerId, 'circle-radius', highlightStyle['circle-radius']);
                    }
                } else {
                    // Restaurer le style par défaut
                    if (type === 'fill') {
                        this._map.setPaintProperty(layerId, 'fill-color', this._originalStyles[pk]['fill-color']);
                        this._map.setPaintProperty(layerId, 'fill-opacity', this._originalStyles[pk]['fill-opacity']);
                    } else if (type === 'line') {
                        this._map.setPaintProperty(layerId, 'line-color', this._originalStyles[pk]['line-color']);
                        this._map.setPaintProperty(layerId, 'line-width', this._originalStyles[pk]['line-width']);
                    } else if (type === 'circle') {
                        this._map.setPaintProperty(layerId, 'circle-color', this._originalStyles[pk]['circle-color']);
                        this._map.setPaintProperty(layerId, 'circle-radius', this._originalStyles[pk]['circle-radius']);
                    }
                }
            }
        }
    }

    // select(pk, on = true) {
    //     const layerId = this._current_objects[pk];
    //     if (layerId) {
    //         const layer = this._map.getLayer(layerId);
    //         if (layer) {
    //             const type = layer.type;
    //
    //             if (on) {
    //                 // Appliquer le style de sélection
    //                 const selectStyle = {
    //                     'fill-color': 'red',
    //                     'fill-opacity': 1,
    //                     'line-color': 'red',
    //                     'line-width': 7,
    //                     'circle-color': 'red',
    //                     'circle-radius': 9
    //                 };
    //
    //                 if (type === 'fill') {
    //                     this._map.setPaintProperty(layerId, 'fill-color', selectStyle['fill-color']);
    //                     this._map.setPaintProperty(layerId, 'fill-opacity', selectStyle['fill-opacity']);
    //                 } else if (type === 'line') {
    //                     this._map.setPaintProperty(layerId, 'line-color', selectStyle['line-color']);
    //                     this._map.setPaintProperty(layerId, 'line-width', selectStyle['line-width']);
    //                 } else if (type === 'circle') {
    //                     this._map.setPaintProperty(layerId, 'circle-color', selectStyle['circle-color']);
    //                     this._map.setPaintProperty(layerId, 'circle-radius', selectStyle['circle-radius']);
    //                 }
    //             } else {
    //                 // Restaurer le style par défaut
    //                 if (type === 'fill') {
    //                     this._map.setPaintProperty(layerId, 'fill-color', this._originalStyles[pk]['fill-color']);
    //                     this._map.setPaintProperty(layerId, 'fill-opacity', this._originalStyles[pk]['fill-opacity']);
    //                 } else if (type === 'line') {
    //                     this._map.setPaintProperty(layerId, 'line-color', this._originalStyles[pk]['line-color']);
    //                     this._map.setPaintProperty(layerId, 'line-width', this._originalStyles[pk]['line-width']);
    //                 } else if (type === 'circle') {
    //                     this._map.setPaintProperty(layerId, 'circle-color', this._originalStyles[pk]['circle-color']);
    //                     this._map.setPaintProperty(layerId, 'circle-radius', this._originalStyles[pk]['circle-radius']);
    //                 }
    //             }
    //         }
    //     }
    // }

    addLayer(feature, category = null) {
        const pk = this.getPk(feature);
        const layerId = `layer-${pk}`;
        const sourceId = `source-${pk}`;

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
                    'fill-opacity': 0.4
                }
            };
        } else if (geometryType === 'LineString') {
            layerConfig = {
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': this.options.style.color || '#B42222',
                    'line-width': 2
                }
            };
        } else if (geometryType === 'Point') {
            layerConfig = {
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': 6,
                    'circle-color': this.options.style.color || '#B42222'
                }
            };
        }

        this._map.addLayer(layerConfig);
        this._current_objects[pk] = layerId;
        console.log(this._current_objects[pk]);

        // Le problème vient certainement de la
        const categoryName = category || this.options.modelname;
        console.log(categoryName);
        if (!this.layers.overlays[categoryName]) {
            this.layers.overlays[categoryName] = {};
        }
        this.layers.overlays[categoryName][pk] = layerId;

        // Stocker le style par défaut
        this._originalStyles[pk] = layerConfig.paint;
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

    getLayer(pk) {
        return this._objects[pk];
    }

    getPk(feature) {
        return feature.properties.id || feature.id || this._generateUniqueId(feature);
    }

    _generateUniqueId(feature) {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    getCurrentLayers() {
        return this._current_objects;
    }

    jumpTo(pk) {
        const layer = this.getLayer(pk);
        if (layer) {
            this._map.fitBounds(layer.getBounds());
        }
    }
}
