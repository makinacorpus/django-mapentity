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
                    padding: 0,
                    duration: 0
                });
            }
        } else {
            // If it's a FeatureCollection, add each feature as a separate layer
            this.addLayer(geojson, dataId);
        }

    }

    highlight(primaryKey, on = true) {
        if (this.options.readonly) return;

        const layersBySource = Object.values(this._current_objects).flat(); // récupère tous les layerIds

        for (const layerId of layersBySource) {
            const layer = this._map.getLayer(layerId);
            if (!layer) continue;

            const sourceId = layer.source;
            const source = this._map.getSource(sourceId);
            if (!source || !source._data) continue;

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
                if (g.type) foundTypes.add(g.type);
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
                    if (g.type) foundTypes.add(g.type);
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
        this._map.addLayer({
            id: `${layerIdBase}-polygons`,
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
        layerIds.push(`${layerIdBase}-polygons`);
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

      // Méthode getPrimaryKey modifiée pour gérer les GeometryCollection
    getPrimaryKey(feature) {
        // Sinon, utiliser la méthode classique
        return feature.properties?.id ||feature.id || this._generateUniqueId(feature);
    }

    _generateUniqueId(feature) {
        return `${Math.random().toString(36).substring(2, 9)}`;
    }

    _generateGroupId(feature) {
        const timestamp = Date.now(); // millisecondes actuelles
        const randomPart = Math.random().toString(36).substring(2, 10); // 8 caractères aléatoires
        return `group-${timestamp}-${randomPart}`;
    }


    getCurrentLayers() {
        return this._current_objects;
    }

    getBoundsLayer() {
        return this.boundsLayer;
    }

    // mettre update en commentaire pour éviter un refresh de la carte car l'implémentation de reloadList ne correspond pas à l'esprit maplibre
    updateFromPks(primaryKeys) {
        const new_objects = {};

        // Construire new_objects avec les layers qui doivent être visibles
        primaryKeys.forEach(primaryKey => {
            const layer = this._objects[primaryKey];
            console.log('updateFromPks', primaryKey, layer);
            if (layer) {
                new_objects[primaryKey] = layer;
                // Si la layer n'existe pas encore dans current_objects, l'ajouter
                if (!this._current_objects[primaryKey]) {
                    this.addLayer(layer);
                }
            }
        });

        Object.keys(this._groupedFeatyresObjects).forEach(primaryKey => {
            const key = parseInt(primaryKey);
            console.log('updateFromPks grouped', (key + 1) );
        })
        // Supprimer les layers qui ne sont plus dans primaryKeys
        Object.keys(this._current_objects).forEach(primaryKey => {
            console.log('updateFromPks current', primaryKey);
            if (!new_objects[primaryKey] ) {
                this.removeLayer(this._current_objects[primaryKey], primaryKey);
                // Supprimer la référence de current_objects
                delete this._current_objects[primaryKey];

                // Supprimer aussi des overlays
                const category = this.options.modelname;
                if (this.layers.overlays[category] && this.layers.overlays[category][primaryKey]) {
                    delete this.layers.overlays[category][primaryKey];
                }
            }
        });

    }

    // Fit the map to the bounds of the layer we clicked on
    jumpTo(pk) {
        const layer = this.getLayer(pk);
        console.log('jumpTo', layer);
        if (layer) {
            const bounds = this.calculateBounds(layer);
            if (bounds) {
                this._map.fitBounds(bounds, { padding: 20, maxZoom: 16 });
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