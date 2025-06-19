class MaplibreObjectsLayer {
    constructor(geojson, options) {
        this._map = null;
        this._objects = {};
        this._current_objects = {};
        this.options = { ...options };
        this.boundsLayer = null;
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
        // Skip interactions in readonly mode
        if (this.options.readonly){
            return;
        }

        const features = this._map.queryRenderedFeatures(e.point, {
            layers: Object.values(this._current_objects)
        });

        if (features.length > 0) {
            const feature = features[0];
            if (this.options.objectUrl) {
                window.location = this.options.objectUrl(feature.properties, feature);
            }
        }
    }

    _onMouseMove(e) {
        if (this.options.readonly) return;

        const features = this._map.queryRenderedFeatures(e.point);
        const hoveredFeature = features[0];

        let hoveredFeatureId = null;

        if (hoveredFeature) {
            hoveredFeatureId = hoveredFeature.id || hoveredFeature.properties?.id;
            this._map.getCanvas().style.cursor = 'pointer';
        } else {
            this._map.getCanvas().style.cursor = '';
        }

        // RESET hover = false sur tous les features ≠ hoveredFeatureId
        const layers = Object.values(this._current_objects).flat();

        for (const layerId of layers) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) continue;

            for (const feature of source._data.features) {
                if (!feature.id) continue;
                const isHovered = feature.id === hoveredFeatureId;
                this._map.setFeatureState(
                    { source: sourceId, id: feature.id },
                    { hover: isHovered }
                );
            }
        }

        // Gérer le popup
        if (hoveredFeatureId) {
            if (this.currentPopup) {
                this.currentPopup.remove();
                this.currentPopup = null;
            }

            const coordinates =
                hoveredFeature.geometry.type === 'Point'
                    ? hoveredFeature.geometry.coordinates
                    : turf.centroid(hoveredFeature).geometry.coordinates;

            const description = hoveredFeature.properties.name || 'No data available';

            this.currentPopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'custom-popup',
                anchor: 'left',
                offset: 10,
            })
                .setLngLat(coordinates)
                .setHTML(`<div class="popup-content">${description}</div>`)
                .addTo(this._map);
        } else if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }



    async load(url) {
        console.log("Loading data from URL: " + url);
        this.loading = true;
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.addData(data);
            this._map.fire('layers:added', { layers: this.getLayers() });
        } catch (error) {
            console.error("Could not load url '" + url + "'", error);
        }
    }


    addData(geojson) {
        console.log("Adding data to map:", geojson);

        // Generate a unique ID for this GeoJSON data
        const dataId = this._generateUniqueId();

        // Store the complete GeoJSON object
        this._objects[dataId] = geojson;

        if(geojson.type === "Feature"){

            // Add as a single layer
            this.addLayer(geojson,dataId, true, true);

             // Calculate and fit bounds
            this.boundsLayer = this.calculateBounds(geojson);
            if (this.boundsLayer) {
                this._map.fitBounds(this.boundsLayer, {
                    maxZoom: 16,
                    padding: 50,
                    duration: 0
                });
            }
        } else {
            // If it's a FeatureCollection, add each feature as a separate layer
            this.addLayer(geojson, dataId);
        }

    }

    highlight(primaryKey, on = true) {
        if (this.options.readonly) {
            return;
        }

        const layersBySource = Object.values(this._current_objects).flat(); // récupère tous les layerIds

        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) {
                continue;
            }

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) {
                continue;
            }

            for (const feature of source._data.features) {
                if (!feature.id) continue;

                const isMatch = feature.id === primaryKey;
                this._map.setFeatureState(
                    { source: sourceId, id: feature.id },
                    { hover: isMatch && on }
                );
            }
        }
    }



    select(primaryKey, on = true) {
        this.highlight(primaryKey, true);
    }

    addLayer(geojson, pk, detailStatus = false, readonly = false) {
        const primaryKey = pk;
        const foundTypes = new Set();

        if (geojson.type === "Feature") {
            if (!geojson.id && geojson.properties?.id) {
                geojson.id = geojson.properties.id;
            }
            const geomType = geojson.geometry?.type;
            if (geomType === "GeometryCollection" && geojson.geometry.geometries) {
                geojson.geometry.geometries.forEach(g => {
                    if (g.type) {
                        foundTypes.add(g.type);
                    }
                });
            } else if (geomType) {
                foundTypes.add(geomType);
            }
        } else if (geojson.type === "FeatureCollection") {
            geojson.features.forEach(feature => {
                if (!feature.id && feature.properties?.id) {
                    feature.id = feature.properties.id;
                }
                const geomType = feature.geometry?.type;
                if (geomType === "GeometryCollection" && feature.geometry.geometries) {
                    feature.geometry.geometries.forEach(g => {
                        if (g.type) {
                            foundTypes.add(g.type);
                        }
                    });
                } else if (geomType) {
                    foundTypes.add(geomType);
                }
            });
        }

        console.log("geojson features with id:", geojson.features ?? geojson);

        const layerIdBase = `layer-${primaryKey}`;
        const sourceId = `source-${primaryKey}`;

        const isReadonly = readonly || this.options.readonly;
        this.options.readonly = isReadonly;

        this._map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
        });

        const style = detailStatus ? this.options.detailStyle : this.options.style;
        const rgba = parseColor(style.color); // [r, g, b, a]
        const rgbaStr = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`;
        const fillOpacity = style.fillOpacity ?? 0.7; // default fill opacity
        const strokeOpacity = style.opacity ?? 1.0; // default opacity
        const strokeColor = style.color;
        const strokeWidth = style.weight ?? 5; // default width

        const layerIds = [];

        if (foundTypes.has("Point") || foundTypes.has("MultiPoint")) {
            this._map.addLayer({
                id: `${layerIdBase}-points`,
                type: 'circle',
                source: sourceId,
                filter: ['any',
                    ['==', ['geometry-type'], 'Point'],
                    ['==', ['geometry-type'], 'MultiPoint']
                ],
                paint: {
                    'circle-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000', // Change color on hover
                        rgbaStr
                    ],
                    'circle-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        fillOpacity, // Increase opacity on hover
                        fillOpacity
                    ],
                    'circle-stroke-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000', // Change color on hover
                        strokeColor
                    ],
                    'circle-stroke-opacity': strokeOpacity,
                    'circle-stroke-width': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        strokeWidth, // Increase width on hover
                        strokeWidth
                    ],
                    'circle-radius': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        10, // Increase radius on hover
                        8
                    ]
                }
            });
            layerIds.push(`${layerIdBase}-points`);
        }

        if (foundTypes.has("LineString") || foundTypes.has("MultiLineString")) {
            this._map.addLayer({
                id: `${layerIdBase}-lines`,
                type: 'line',
                source: sourceId,
                filter: ['any',
                    ['==', ['geometry-type'], 'LineString'],
                    ['==', ['geometry-type'], 'MultiLineString']
                ],
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000',
                        strokeColor
                    ],
                    'line-width': strokeWidth,
                    'line-opacity': strokeOpacity
                }
            });
            layerIds.push(`${layerIdBase}-lines`);
        }

        if (foundTypes.has("Polygon") || foundTypes.has("MultiPolygon")) {
            // Add a fill layer for polygons
            this._map.addLayer({
                id: `${layerIdBase}-polygon-fill`,
                type: 'fill',
                source: sourceId,
                filter: ['any',
                    ['==', ['geometry-type'], 'Polygon'],
                    ['==', ['geometry-type'], 'MultiPolygon']
                ],
                paint: {
                    'fill-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000',
                        rgbaStr
                    ],
                    'fill-opacity': fillOpacity
                }
            });

            // Add a stroke layer for polygons
            this._map.addLayer({
                id: `${layerIdBase}-polygon-stroke`,
                type: 'line',
                source: sourceId,
                filter: ['any',
                    ['==', ['geometry-type'], 'Polygon'],
                    ['==', ['geometry-type'], 'MultiPolygon']
                ],
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#FF0000',
                        strokeColor
                    ],
                    'line-width': strokeWidth,
                    'line-opacity': strokeOpacity
                }
            });
            layerIds.push(`${layerIdBase}-polygon-fill`, `${layerIdBase}-polygon-stroke`);
        }

        this._current_objects[primaryKey] = layerIds;

        const category = this.options.modelname;
        if (!this.layers.overlays[category]) {
            this.layers.overlays[category] = {};
        }
        this.layers.overlays[category][primaryKey] = layerIds;

        console.log('Ajout auto de 1 à 3 couches selon géométrie', layerIds);
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

   // removeLayer(layerId) {
   //      if (this._map.getLayer(layerId)) {
   //          this._map.removeLayer(layerId);
   //      }
   //      const sourceId = layerId.replace(/^layer-/, 'source-');
   //      if (this._map.getSource(sourceId)) {
   //          this._map.removeSource(sourceId);
   //      }
   //  }

    toggleLayer(layerId, visible = true) {
        this._map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    getLayers() {
        return this.layers;
    }

    getLayer(primaryKey) {
        return this._objects[primaryKey];
    }

      // Méthode getPrimaryKey modifiée pour gérer les GeometryCollection
    getPrimaryKey(feature) {
        // Sinon, utiliser la méthode classique
        return feature.properties?.id ||feature.id || this._generateUniqueId(feature);
    }

    _generateUniqueId(feature) {
        return `${Math.random().toString(36).substring(2, 9)}`;
    }

    getCurrentLayers() {
        return this._current_objects;
    }

    getBoundsLayer() {
        return this.boundsLayer;
    }

    updateFromPks(primaryKeys) {
        if (!this._track_objects) {
            this._track_objects = {};
        }

        let sourceId = null;
        let fullFeatureCollection = null;

        const layersBySource = Object.values(this._current_objects).flat();

        if (layersBySource.length === 0) {
            console.error("PROBLÈME: Aucun layer trouvé dans _current_objects");
            return;
        }

        // Trouver le sourceId via les layerIds dans _current_objects
        for (let i = 0; i < layersBySource.length; i++) {
            const layerId = layersBySource[i];
            const layer = this._map.getLayer(layerId);

            if (!layer) {
                console.log("Layer not found, continuing...");
                continue;
            }

            const currentSourceId = layer.source;
            const source = this._map.getSource(currentSourceId);

            if (source && source._data && source._data.features) {
                sourceId = currentSourceId;
                fullFeatureCollection = source._data;
                break;
            }
        }

        if (!sourceId || !fullFeatureCollection) {
            console.warn('Aucune source valide trouvée');
            return;
        }

        const source = this._map.getSource(sourceId);

        // Sauvegarder les features actuelles si non encore tracées
        fullFeatureCollection.features.forEach(feature => {
            const featureId = feature.properties?.id;
            if (featureId && !this._track_objects[featureId]) {
                this._track_objects[featureId] = { ...feature };
            }
        });

        // Reconstituer les features à afficher à partir de primaryKeys
        const featuresToShow = [];

        primaryKeys.forEach(primaryKey => {
            const feature = this._track_objects[primaryKey];
            if (feature) {
                featuresToShow.push(feature);
            }
        });

        // Mettre à jour la source avec les nouvelles features visibles
        source.setData({
            type: 'FeatureCollection',
            features: featuresToShow
        });

        // Nettoyer les overlays
        const category = this.options.modelname;
        if (!this.layers.overlays[category]) this.layers.overlays[category] = {};

        Object.keys(this.layers.overlays[category]).forEach(id => {
            if (!primaryKeys.includes(id)) {
                delete this.layers.overlays[category][id];
            }
        });
    }



    // Fit the map to the bounds of the layer we clicked on
    jumpTo(pk) {
        let feature = null;
        const layersBySource = Object.values(this._current_objects).flat();

        if (layersBySource.length === 0) {
            console.warn("Aucun layer trouvé dans _current_objects");
            return;
        }

        // Chercher la feature dans les sources actives
        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const source = this._map.getSource(layer.source);
            if (source && source._data && source._data.features) {
                const foundFeature = source._data.features.find(f => f.properties?.id === pk);
                if (foundFeature) {
                    feature = foundFeature;
                    break;
                }
            }
        }

        if (!feature) {
            console.warn(`Feature avec l'id ${pk} non trouvée`);
            return;
        }

        const bounds = this.calculateBounds(feature);
        if (bounds) {
            this._map.fitBounds(bounds, { padding: 20, maxZoom: 16 });
        } else {
            console.warn(`Impossible de calculer les bounds pour la feature ${pk}`);
        }
    }

    calculateBounds(geojson) {
        if (!geojson) {
            return null;
        }

        const bounds = new maplibregl.LngLatBounds();

        // Fonction utilitaire pour extraire et aplatir les coordonnées
        const flattenCoords = (geometry) => {
            const { type, coordinates, geometries } = geometry;
            let flattened = [];

            switch (type) {
                case 'Point':
                    flattened = [coordinates];
                    break;
                case 'MultiPoint':
                case 'LineString':
                    flattened = coordinates;
                    break;
                case 'Polygon':
                case 'MultiLineString':
                    flattened = coordinates.flat();
                    break;
                case 'MultiPolygon':
                    flattened = coordinates.flat(2);
                    break;
                case 'GeometryCollection':
                    geometries?.forEach(geom => {
                        flattened.push(...flattenCoords(geom));
                    });
                    break;
            }

            return flattened;
        };

        // Cas d'un seul Feature
        if (geojson.geometry) {
            const coords = flattenCoords(geojson.geometry);
            coords.forEach(coord => bounds.extend(coord));
        }

        // Cas d'une FeatureCollection
        else if (geojson.features) {
            geojson.features.forEach(feature => {
                const geometry = feature.geometry;
                if (!geometry) return;
                const coords = flattenCoords(geometry);
                coords.forEach(coord => bounds.extend(coord));
            });
        }

        return bounds.isEmpty() ? null : bounds;
    }

}