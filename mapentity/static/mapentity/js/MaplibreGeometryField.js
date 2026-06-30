class MaplibreGeometryField {
    constructor(map, fieldId, options = {}) {
        this.fieldId = fieldId;
        this.options = {...options};

        // Options can be injected by the template as strings
        this.options.modifiable = this.options.modifiable === true || this.options.modifiable === 'true';

        // Detect geometry types
        const allowedTypesOption = this.options.allowedTypes;
        const geomTypeOption = this.options.geomType;
        let geomTypes = [];

        if (allowedTypesOption) {
            if (Array.isArray(allowedTypesOption)) {
                geomTypes = allowedTypesOption.map(t => t.toLowerCase());
            } else if (typeof allowedTypesOption === 'string') {
                try {
                    const parsed = JSON.parse(allowedTypesOption);
                    if (Array.isArray(parsed)) {
                        geomTypes = parsed.map(t => t.toLowerCase());
                    } else {
                        geomTypes = [allowedTypesOption.toLowerCase()];
                    }
                } catch (e) {
                    if (allowedTypesOption.includes(',')) {
                        geomTypes = allowedTypesOption.split(',').map(t => t.trim().toLowerCase());
                    } else {
                        geomTypes = [allowedTypesOption.toLowerCase()];
                    }
                }
            }
        } else if (geomTypeOption) {
            if (Array.isArray(geomTypeOption)) {
                geomTypes = geomTypeOption.map(t => t.toLowerCase());
            } else if (typeof geomTypeOption === 'string') {
                try {
                    const parsed = JSON.parse(geomTypeOption);
                    if (Array.isArray(parsed)) {
                        geomTypes = parsed.map(t => t.toLowerCase());
                    } else {
                        geomTypes = [geomTypeOption.toLowerCase()];
                    }
                } catch (e) {
                    if (geomTypeOption.includes(',')) {
                        geomTypes = geomTypeOption.split(',').map(t => t.trim().toLowerCase());
                    } else {
                        geomTypes = [geomTypeOption.toLowerCase()];
                    }
                }
            }
        }

        // Store the normalized list of geometry types
        this.options.geomTypes = geomTypes;

        // If it's a single geometry type, fallback to standard detection on that type
        // Otherwise, if it has multiple types, it is treated as a GeometryCollection
        let geomType = '';
        if (geomTypes.length === 1) {
            geomType = geomTypes[0];
        } else if (geomTypes.length > 1) {
            geomType = 'geometrycollection';
        }

        this.options.isGeneric = geomType === 'geometry';
        this.options.isGeometryCollection = /geometrycollection$/.test(geomType);
        this.options.isCollection = /(^multi|collection$)/.test(geomType) || geomTypes.length > 1;
        this.options.isLineString = /linestring$/.test(geomType);
        this.options.isPolygon = /polygon$/.test(geomType);
        this.options.isPoint = /point$/.test(geomType);

        // Distinction between single and multi for base types
        this.options.isMultiPolygon = /^multipolygon$/.test(geomType);
        this.options.isMultiLineString = /^multilinestring$/.test(geomType);
        this.options.isMultiPoint = /^multipoint$/.test(geomType);

        // Initialize the components
        this.dataManager = new GeometryDataManager(this.options);
        this.fieldStore = new MaplibreFieldStore(this.fieldId, this.options);

        this.livePopup = null;
        this.isDrawingLine = false;
        this.isDrawingPolygon = false;
        this.isDrawingRectangle = false;
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;

        this.map = map;
        
        // Detect if in edit mode (PK present)
        this.options.isUpdate = !!document.body.dataset.pk;

        // Add the fieldId to the options for the DrawControlManager
        this.options.fieldId = this.fieldId;

        // Reuse the existing DrawControlManager if the map already has one (multi-geom)
        if (this.map._drawManager) {
            this.drawManager = this.map._drawManager;
            // Add the specific controls for this field to the existing Geoman
            this.drawManager.addFieldControls(this.options);
        } else {
            this.drawManager = new MaplibreDrawControlManager(map, this.options);
            this.map._drawManager = this.drawManager;
        }

        this.gmEvents = [];

        // Custom DOM markers (for fields with customIcon)
        // Map: featureId -> maplibregl.Marker
        this._customMarkers = {};

        this._setupGeomanEvents();
    }

    /**
     * Utility function to get the GeoJSON of a feature
     * @param featureData {Object} - The Geoman feature containing the geometry data
     * @return {Object|null} - Returns the GeoJSON object or null in case of an error
     * @private
     */
    _getGeoJson(featureData) {
        try {
            return featureData.getGeoJson();
        } catch (e) {
            console.warn('Cannot retrieve GeoJSON:', e);
            return null;
        }
    }

    /**
     * Get the collection of features
     * @return {Object} - A GeoJSON object of type FeatureCollection containing all features
     * @private
     */
    _getFeatureCollection() {
        return {
            type: 'FeatureCollection',
            features: this.gmEvents
                .map(e => e.geojson)
                .filter(f => !!f)
        };
    }

    /**
     * Update gmEvents with new data or removal
     * @param event {Object} - The Geoman event containing the feature data
     * @return {boolean} - Returns true if the event was successfully processed, false otherwise
     * @private
     */
    _updateEventsHistory(event) {
        const eventId = event?.feature?.id;
        if (!eventId) {
            console.warn('Event without feature ID, skipping');
            return false;
        }

        if (event.type === 'gm:remove') {
            // Supprimer la feature du tableau
            const index = this.gmEvents.findIndex(e => e.id === eventId);
            if (index !== -1) {
                this.gmEvents.splice(index, 1);
            }
        } else {
            // Pour create, editend, dragend etc.
            const geoJson = event?.feature ? this._getGeoJson(event.feature) : null;
            if (!geoJson) {
                console.warn('Could not extract GeoJSON from feature');
                return false;
            }

            const eventData = {
                id: eventId,
                type: event?.type,
                shape: event?.shape ?? undefined,
                geojson: geoJson,
            };

            const index = this.gmEvents.findIndex(e => e.id === eventId);
            if (index !== -1) {
                // Remplacer la donnée existante
                this.gmEvents[index] = eventData;
            } else {
                // Ajouter nouvelle entrée
                this.gmEvents.push(eventData);
            }
        }

        return true;
    }

    /**
     * Process and save the geometry after a create, editend, dragend, or remove event
     * @param event {Object} - The Geoman event containing the feature data
     * @return {void}
     * @private
     */
    _processAndSaveGeometry(event) {
        // Mettre à jour l'historique des événements
        if (!this._updateEventsHistory(event)) {
            console.warn('MaplibreGeometryField: update events history failed');
            return;
        }

        const allFeatures = this._getFeatureCollection();
        let normalizedData;

        // Management of 'Multi' and 'Collection' Types
        if (this.options.isCollection) {
            // Extract geometries from features
            // Note: feature can be a GeoJSON Feature {type: "Feature", geometry: {...}}
            // or directly a geometry {type: "Polygon", coordinates: [...]}
            const geometries = allFeatures.features.map(feature => {
                if (feature.type === 'Feature' && feature.geometry) {
                    return feature.geometry;
                }
                // If it's directly a geometry (with a type and coordinates)
                if (feature.type && feature.coordinates) {
                    return feature;
                }
                // Fallback
                return feature.geometry || feature;
            });
            
            // We check the specific field type to know how to normalize
            if (this.options.isMultiPolygon) {
                normalizedData = this.dataManager.normalizeToMultiPolygon(geometries);
            } else if (this.options.isMultiLineString) {
                normalizedData = this.dataManager.normalizeToMultiLineString(geometries);
            } else if (this.options.isMultiPoint) {
                normalizedData = this.dataManager.normalizeToMultiPoint(geometries);
            } else {
                // Generic GeometryCollection or unhandled case
                // If there is only a single geometry, serialize it directly to match simple model fields
                const isExplicitCollection = this.options.geomType === 'GEOMETRYCOLLECTION' || this.options.geomType === 'geometrycollection';
                if (geometries.length === 1 && !isExplicitCollection) {
                    normalizedData = geometries[0];
                } else {
                    normalizedData = this.dataManager.normalizeToGeometryCollection(geometries);
                }
            }
        } else {
            // Simple specific mode: normalize by type
            if (this.options.isLineString || this.options.isPolygon || this.options.isPoint || this.options.isGeneric) {
                // For deletion events, we take all remaining features (should be 0 or 1)
                // For other events, we take the feature that has just been modified/created
                let targetFeature = null;
                
                if (event.type === 'gm:remove') {
                    targetFeature = allFeatures.features[0];
                } else if (event.feature) {
                    // If the event provides the feature, we use its GeoJSON
                    targetFeature = this._getGeoJson(event.feature);
                    
                    // Fallback if _getGeoJson fails
                    if (!targetFeature && allFeatures.features.length > 0) {
                        targetFeature = allFeatures.features.find(f => f.id === event.feature.id) || allFeatures.features.at(-1);
                    }
                } else {
                    targetFeature = allFeatures.features.at(-1);
                }

                if (targetFeature) {
                    // For a simple field, the geometry is sent directly (not a FeatureCollection)
                    // If it's already a feature, the geometry is extracted
                    normalizedData = targetFeature.geometry || targetFeature;
                    
                    // If it is a simple point, Geoman can sometimes return coordinates as an object {lng, lat}
                    // We ensure we have an array for GeoJSON
                    if (normalizedData.type === 'Point' && !Array.isArray(normalizedData.coordinates)) {
                        const coords = normalizedData.coordinates;
                        if (coords.lng !== undefined && coords.lat !== undefined) {
                            normalizedData.coordinates = [coords.lng, coords.lat];
                        }
                    }
                } else {
                    // If no feature is available (all deleted), normalize with null
                    normalizedData = null;
                }
            }
        }

        // Save if data has been normalized
        if (normalizedData !== undefined) {
            this.fieldStore.save(normalizedData);
        }
    }

    /**
     * Handling click events during drawing
     * @param event {Object} - The click event containing the click coordinates
     * @return {void}
     * @private
     */
    _handleDrawingClick(event) {
        if (!this.isDrawingLine && !this.isDrawingPolygon && !this.isDrawingRectangle) {
            return;
        }

        const coords = [event.lngLat.lng, event.lngLat.lat];

        if (this.isDrawingLine) {
            // Add the clicked point to the drawing coordinates
            this.currentDrawingCoords.push(coords);
            this._updateDrawingPopup(coords, false);
        } else if (this.isDrawingRectangle) {
            // For the rectangle, we only store the first point
            if (this.currentDrawingCoords.length === 0) {
                this.rectangleStartCoord = coords;
                this.currentDrawingCoords.push(coords);
                this._updateDrawingPopup(coords, false);
            }
        } else if (this.isDrawingPolygon) {
            // Add the clicked point to the polygon drawing coordinates
            this.currentDrawingCoords.push(coords);
            this._updateDrawingPopup(coords, false);
        }
    }

    /**
     * Mouse movement handling during live drawing
     * @param event {Object} - The mouse movement event containing marker data
     * @return {void}
     * @private
     */
    _handleLiveDrawing(event) {
        if ((!this.isDrawingLine && !this.isDrawingPolygon && !this.isDrawingRectangle) ||
            !event.markerData?.position?.coordinate) {
            return;
        }

        const mouseCoords = event.markerData.position.coordinate;

        // Update the popup with the mouse position
        this._updateDrawingPopup(mouseCoords, true);
    }

    /**
     * Updates the live drawing popup with distances or areas
     * @param currentCoords {Array} - The current coordinates of the marker
     * @param isLive {boolean} - Indicates whether it is live tracking or not
     * @return {void}
     * @private
     */
    _updateDrawingPopup(currentCoords, isLive = false) {
        if (!this.livePopup) {
            return;
        }

        let formattedMessage = '';

        if (this.isDrawingLine) {
            formattedMessage = this._getLineDrawingMessage(currentCoords, isLive);
        } else if (this.isDrawingRectangle) {
            formattedMessage = this._getRectangleDrawingMessage(currentCoords, isLive);
        } else if (this.isDrawingPolygon) {
            formattedMessage = this._getPolygonDrawingMessage(currentCoords, isLive);
        }

        // Show popup at current position
        this.livePopup.setLngLat(currentCoords).setHTML(formattedMessage);
    }

    /**
     * Gets the drawing message for the line
     * @param currentCoords {Array} - The current coordinates of the marker
     * @param isLive {boolean} - Indicates if it is a live tracking or not
     * @return {string} - The formatted drawing message
     * @private
     */
    _getLineDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return gettext('Click to start drawing the line');
        } else if (this.currentDrawingCoords.length >= 1) {
            const tempCoords = [...this.currentDrawingCoords];

            if (isLive) {
                tempCoords.push(currentCoords);
            }

            if (tempCoords.length >= 2) {
                const tempLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: tempCoords
                    }
                };

                const distance = turf.length(tempLine, { units: 'kilometers' });
                const formattedDistance = `${distance.toFixed(2)} km`;

                if (this.currentDrawingCoords.length === 1) {
                    return formattedDistance + '<br>' + gettext('Click to continue drawing the line');
                } else {
                    return formattedDistance + '<br>' + gettext('Click on the last point to finish the line');
                }
            } else {
                return gettext('Click to continue drawing the line');
            }
        }
        return '';
    }

    /**
     * Gets the drawing message for the rectangle
     * @param currentCoords {Array} - The current coordinates of the marker
     * @param isLive {boolean} - Indicates if it is a live tracking or not
     * @return {string} - The formatted drawing message
     * @private
     */
    _getRectangleDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return gettext('Click and drag to draw the rectangle');
        } else if (this.currentDrawingCoords.length === 1) {
            if (isLive && this.rectangleStartCoord) {
                // Create a temporary rectangle with the start coordinates and the current position
                const tempRectangle = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            this.rectangleStartCoord,
                            [currentCoords[0], this.rectangleStartCoord[1]],
                            currentCoords,
                            [this.rectangleStartCoord[0], currentCoords[1]],
                            this.rectangleStartCoord
                        ]]
                    }
                };

                const area = turf.area(tempRectangle) / 1000000; // Convert to km²
                const formattedArea = `${area.toFixed(2)} km²`;
                return formattedArea + '<br>' + gettext('Click to finish the rectangle');
            } else {
                return gettext('Click to finish the rectangle');
            }
        }
        return '';
    }

    /**
     * Gets the drawing message for the polygon
     * @param currentCoords {Array} - The current coordinates of the marker
     * @param isLive {boolean} - Indicates if it is a live tracking or not
     * @return {string} - The formatted drawing message
     * @private
     */
    _getPolygonDrawingMessage(currentCoords, isLive) {
        if (this.currentDrawingCoords.length === 0) {
            return gettext('Click to start drawing the shape');
        } else if (this.currentDrawingCoords.length === 1 || this.currentDrawingCoords.length === 2) {
            return gettext('Click to continue drawing the shape');
        }else if (this.currentDrawingCoords.length >= 3) {
            return gettext('Click on the first point to close the shape');
        }
        return '';
    }

    /**
     * Resets the drawing coordinates
     * @return {void}
     * @private
     */
    _resetDrawingCoords() {
        // Reset the coordinates to start a new shape
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;

        // Ensure Geoman layers remain on top after creation
        if (this.map.getStyle()) {
            const layers = this.map.getStyle().layers || [];
            layers.forEach(layer => {
                if (layer.id.startsWith('gm-') || layer.id.startsWith('geoman-')) {
                    try {
                        this.map.moveLayer(layer.id);
                    } catch (e) {
                        // Ignore if the layer is no longer there
                    }
                }
            });
        }
    }

    /**
     * Stop live drawing tracking
     * @return {void}
     * @private
     */
    _stopLiveDrawingTracking() {
        if (this.livePopup) {
            this.livePopup.remove();
            this.livePopup = null;
        }

        // Reset all drawing variables
        this.currentDrawingCoords = [];
        this.rectangleStartCoord = null;
        this.isDrawingLine = false;
        this.isDrawingPolygon = false;
        this.isDrawingRectangle = false;
    }

    /**
     * Load the initial geometry from the form field
     * @private
     */
    _loadInitialGeometry() {
        const value = this.fieldStore.formField?.value;
        if (!value) return;

        let initialFeatures = [];
        try {
            const geojson = JSON.parse(value);
            const normalized = this.dataManager.normalizeToFeatureCollection(geojson);
            initialFeatures = normalized.features;
        } catch (e) {
            console.warn('MaplibreGeometryField: could not parse initial geometry', e);
            return;
        }

        // Ensure that each feature has a stable ID
        initialFeatures.forEach(f => {
            if (!f.id) {
                f.id = f.properties?.id || generateUniqueId();
            }
        });

        if (initialFeatures.length > 0) {
            // Identify and exclude features currently being edited from the global object layer
            const idsToExclude = initialFeatures
                .map(f => f.id)
                .filter(id => id !== undefined && id !== null);

            // Add the current object's ID if available in the DOM (in case of editing)
            // This allows to hide the original object even if Geoman features have temporary UUIDs
            if (document.body.dataset.pk) {
                const pk = document.body.dataset.pk;
                if (!idsToExclude.includes(pk)) idsToExclude.push(pk);

                const pkInt = parseInt(pk, 10);
                if (!isNaN(pkInt) && !idsToExclude.includes(pkInt)) {
                    idsToExclude.push(pkInt);
                }
            }

            if (idsToExclude.length > 0) {
                this.map.fire('mapentity:exclude-features', { ids: idsToExclude });

                // Repeat on full load to ensure layers are ready
                if (!this.map.loaded()) {
                    this.map.once('load', () => {
                         this.map.fire('mapentity:exclude-features', { ids: idsToExclude });
                    });
                }
            }

            const fitInitialBounds = () => {
                try {
                    const collection = { type: 'FeatureCollection', features: initialFeatures };
                    const bounds = calculateBounds(collection);
                    if (bounds) {
                        this.map.fitBounds(bounds, { padding: 50, maxZoom: 18, animate: false });
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: initial fitBounds failed', e);
                }
            };

            if (this.map.loaded()) {
                setTimeout(fitInitialBounds, 300);
            } else {
                this.map.once('load', () => setTimeout(fitInitialBounds, 300));
            }
        }

        // Wait for Geoman to be loaded to add the features
        const addFeaturesToGeoman = () => {
            const geoman = this.drawManager.getGeoman();
            if (!geoman || !geoman.loaded) {
                setTimeout(addFeaturesToGeoman, 100);
                return;
            }

            // Depending on the version/integration, the API can be exposed via `map.gm` or via the created instance.
            const gmApi = this.map.gm || geoman;
            if (!gmApi?.features) {
                console.warn('MaplibreGeometryField: Geoman API not available (no features), cannot add initial geometry');
                return;
            }

            // Force an initial refresh in case
            this.map.triggerRepaint();

            initialFeatures.forEach(feature => {
                try {
                    // Ensure the feature has an ID for Geoman
                    if (!feature.id) {
                        feature.id = generateUniqueId();
                    }

                    // Inject default styles to ensure visibility (simplestyle spec)
                    feature.properties = feature.properties || {};
                    const defaultStyles = {
                        'stroke': '#3388ff',
                        'stroke-width': 3,
                        'stroke-opacity': 1,
                        'fill': '#3388ff',
                        'fill-opacity': 0.2
                    };
                    Object.entries(defaultStyles).forEach(([k, v]) => {
                         if (feature.properties[k] === undefined) feature.properties[k] = v;
                    });

                    const resolveGeomanSourceName = () => this._resolveGeomanSourceName();

                    // Using the method recommended by the documentation
                    let result;

                    // According to the Geoman version:
                    // - 0.6.x: `importGeoJsonFeature(geojsonFeature)`
                    // - some docs: `addGeoJsonFeature({ shapeGeoJson, sourceName })`
                    // - others: `addGeoJsonFeature(geojsonFeature)`
                    if (typeof gmApi.features.importGeoJsonFeature === 'function') {
                        result = gmApi.features.importGeoJsonFeature(feature);
                    } else if (typeof gmApi.features.addGeoJsonFeature === 'function') {
                        try {
                            // Tentative 1: most common signature (direct GeoJSON)
                            result = gmApi.features.addGeoJsonFeature(feature);
                        } catch (e) {
                            // Tentative 2: Object signature + sourceName
                            const sourceName = resolveGeomanSourceName();
                            result = gmApi.features.addGeoJsonFeature({ shapeGeoJson: feature, sourceName });
                        }
                    } else if (typeof gmApi.features.addGeoJson === 'function') {
                        // Certain versions expose a simpler API
                        result = gmApi.features.addGeoJson(feature);
                    } else if (typeof gmApi.features.addFeature === 'function') {
                        result = gmApi.features.addFeature(feature);
                    } else if (typeof gmApi.features.add === 'function') {
                        result = gmApi.features.add(feature);
                    } else {
                        console.warn('MaplibreGeometryField: no compatible method found to add GeoJSON feature to Geoman');
                        return;
                    }

                    // If result contains the ID directly
                    let addedId = typeof result === 'string' || typeof result === 'number' ? result : result?.id;

                    // Immediate display is enforced by going through Geoman if possible
                    if (gmApi.features.getFeatureById) {
                         const f = gmApi.features.getFeatureById(addedId || feature.id);
                         if (f && f.show) {
                             f.show();
                         }
                    }

                    // We are updating the local gmEvents history directly with the feature we just added
                    // We don't wait for the source because the name can vary and the update can be asynchronous
                    this._updateEventsHistory({
                        type: 'gm:create',
                        feature: {
                            id: addedId || feature.id,
                            getGeoJson: () => feature
                        }
                    });

                    // Add a custom DOM marker for initial Point/MultiPoint features
                    if (this.options.customIcon) {
                        const geomType = (feature.geometry || feature).type;
                        if (geomType === 'Point' || geomType === 'MultiPoint') {
                            const fakeFeature = {
                                id: addedId || feature.id,
                                getGeoJson: () => feature
                            };
                            this._addCustomMarkerForFeature(fakeFeature);
                        }
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: error adding feature to Geoman', e);
                }
            });

            // Force refresh
            this.map.triggerRepaint();

            // Re-center after adding to Geoman to be sure
            setTimeout(() => {
                try {
                    const collection = { type: 'FeatureCollection', features: initialFeatures };
                    const bounds = calculateBounds(collection);
                    if (bounds) {
                        this.map.fitBounds(bounds, { padding: 50, maxZoom: 18, animate: false });
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: post-geoman fitBounds failed', e);
                }

                // Force the style of Geoman layers to ensure they are visible (fallback)
                try {
                    const style = this.map.getStyle();
                    if (style && style.layers) {
                        let updated = false;
                        style.layers.forEach(layer => {
                            // We are targeting the Geoman layers that may not have a defined style.
                            const isGeoman = layer.id.indexOf('gm_') !== -1 || layer.id.indexOf('geoman') !== -1;

                            if (isGeoman && layer.type !== 'symbol') {
                                if (layer.type === 'line') {
                                    this.map.setPaintProperty(layer.id, 'line-color', '#3388ff');
                                    this.map.setPaintProperty(layer.id, 'line-width', 3);
                                    this.map.setPaintProperty(layer.id, 'line-opacity', 1);
                                    updated = true;
                                } else if (layer.type === 'fill') {
                                    this.map.setPaintProperty(layer.id, 'fill-color', '#3388ff');
                                    this.map.setPaintProperty(layer.id, 'fill-opacity', 0.2);
                                    // Add an outline color for the fill if supported (fill-outline-color)
                                    // This helps if the line layer is missing or invisible
                                    this.map.setPaintProperty(layer.id, 'fill-outline-color', '#3388ff');
                                    updated = true;
                                }
                            }
                        });
                        if (updated) {
                            this.map.triggerRepaint();
                        }
                    }
                } catch (e) {
                    console.warn('MaplibreGeometryField: error applying fallback styles', e);
                }
            }, 800);
            
            // Ensure the layers are on top
            this._resetDrawingCoords();
            
            // Force Geoman to recalculate its internal boundaries if necessary
            if (gmApi.update) {
                gmApi.update();
            }
        };

        if (this.map.gm) {
            addFeaturesToGeoman();
        } else {
            this.map.once('gm:loaded', addFeaturesToGeoman);
        }
    }

    /**
     * Attempt to resolve the Geoman data source name
     * @return {string|null} - The source name or null
     * @private
     */
    _resolveGeomanSourceName() {
        const gmApi = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
        
        // Geoman 0.6.x often exposes a `defaultSourceName` on the `features` side.
        const fromApi = gmApi?.features?.defaultSourceName;
        if (typeof fromApi === 'string' && fromApi.length > 0) {
            return fromApi;
        }

        // Fallback: try known sources on the MapLibre side.
        if (this.map.getSource('gm_main')) return 'gm_main';
        if (this.map.getSource('geoman_main')) return 'geoman_main';

        // Last resort: look for a source whose id resembles Geoman.
        const sources = this.map.getStyle?.()?.sources || {};
        const candidate = Object.keys(sources).find(k => k.startsWith('gm_') || k.startsWith('gm-') || k.includes('geoman'));
        return candidate || null;
    }

    /**
     * Retrieve the Geoman data source
     * @private
     */
    _getGeomanLayersSource() {
        const sourceName = this._resolveGeomanSourceName();
        return sourceName ? this.map.getSource(sourceName) : null;
    }

    /**
     * Remove all Geoman features except one optional one
     * @param exceptFeature {Object|null} - The feature (GeoJSON) to keep
     * @private
     */
    _removeAllGeomanFeatures(exceptFeature = null) {
        this._removeOwnedGeomanFeatures(exceptFeature);
    }

    /**
     * Remove only features belonging to this field (those in gmEvents),
     * while preserving features from other fields.
     * @param exceptFeature {Object|null} - The feature (GeoJSON) to keep
     * @private
     */
    _removeOwnedGeomanFeatures(exceptFeature = null) {
        const gmApi = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
        const exceptId = exceptFeature ? exceptFeature.id : null;
        
        // Collect the feature IDs belonging to this field
        const ownedIds = new Set(this.gmEvents.map(e => e.id).filter(id => !!id));
        
        // If no feature belongs to this field, nothing to delete
        if (ownedIds.size === 0) return;

        // 1. Try to find a removal function via API
        let removeFunc = null;
        if (gmApi) {
            if (gmApi.features) {
                // Geoman uses features.delete(id) to remove a feature by ID
                if (typeof gmApi.features.delete === 'function') {
                    removeFunc = gmApi.features.delete.bind(gmApi.features);
                } else if (typeof gmApi.features.remove === 'function') {
                    removeFunc = gmApi.features.remove.bind(gmApi.features);
                } else if (typeof gmApi.features.removeFeature === 'function') {
                    removeFunc = gmApi.features.removeFeature.bind(gmApi.features);
                }
            }
            if (!removeFunc) {
                 if (typeof gmApi.delete === 'function') removeFunc = gmApi.delete.bind(gmApi);
                 else if (typeof gmApi.remove === 'function') removeFunc = gmApi.remove.bind(gmApi);
            }
        }

        if (removeFunc) {
            // Do not delete features from this field (except exceptId)
            ownedIds.forEach(id => {
                if (id != exceptId) {
                    try {
                        removeFunc(id);
                    } catch (e) {
                        console.warn('MaplibreGeometryField: Failed to remove owned feature via API', id, e);
                    }
                }
            });
            return;
        }

        // 2. Fallback: update sources by only removing features from this field
        const sources = this._findAllGeomanSources();
        if (sources.length === 0) {
             console.warn('MaplibreGeometryField: No Geoman sources found for fallback');
             return;
        }

        sources.forEach(source => {
            if (source && source.setData) {
                const data = source._data;
                const features = (data?.geojson?.features) || (data?.features) || [];
                
                // Keep all features EXCEPT those in this field (except exceptId)
                const finalFeatures = features.filter(f => {
                    if (!f.id) return true;
                    // If it's the feature to keep, we'll keep it
                    if (exceptId != null && f.id == exceptId) return true;
                    // If this is a feature of this field, we will remove it
                    if (ownedIds.has(f.id)) return false;
                    // Otherwise (feature of another field), we keep it
                    return true;
                });

                // Add exceptFeature if not already in source
                if (exceptFeature && exceptId != null && !finalFeatures.some(f => f.id == exceptId)) {
                    finalFeatures.push(exceptFeature);
                }
                
                const currentIds = features.map(f => f.id).sort().join(',');
                const newIds = finalFeatures.map(f => f.id).sort().join(',');

                if (currentIds !== newIds) {
                    try {
                        source.setData({
                            type: 'FeatureCollection',
                            features: finalFeatures
                        });
                    } catch (e) {
                        console.error('MaplibreGeometryField: source fallback failed for source', source, e);
                    }
                }
            }
        });
    }

    /**
     * Find all potential sources of Geoman
     * @return {Array} - List of Source objects
     * @private
     */
    _findAllGeomanSources() {
        if (!this.map || !this.map.getStyle) return [];
        const style = this.map.getStyle();
        if (!style || !style.sources) return [];
        
        return Object.keys(style.sources)
            .filter(k => k.startsWith('gm_') || k.startsWith('gm-') || k.includes('geoman'))
            .map(k => this.map.getSource(k))
            .filter(s => !!s);
    }

    /**
     * Determines the Geoman shapes that match the geometry type of this field.
     * @return {Array<string>} - List of accepted Geoman shape names
     * @private
     */
    _getAcceptedShapes() {
        if (this.options.isGeneric || this.options.isGeometryCollection) {
            return ['marker', 'line', 'polygon', 'rectangle'];
        }
        if (this.options.isPoint || this.options.isMultiPoint) return ['marker'];
        if (this.options.isLineString || this.options.isMultiLineString) return ['line'];
        if (this.options.isPolygon || this.options.isMultiPolygon) return ['polygon', 'rectangle'];
        return ['marker', 'line', 'polygon', 'rectangle'];
    }

    /**
     * Checks if a Geoman shape matches the geometry type of this field.
     * @param {string} shape - The name of the Geoman shape (marker, line, polygon, rectangle)
     * @return {boolean}
     * @private
     */
    _isShapeForThisField(shape) {
        return this._getAcceptedShapes().includes(shape);
    }

    /**
     * Checks if this field is the active field in the DrawControlManager.
     * Used for drawing events (create, draw) to route to the correct field.
     * @return {boolean}
     * @private
     */
    _isActiveField() {
        if (!this.drawManager) return true;
        const activeFieldId = this.drawManager.getActiveFieldId();
        // If no active field is set (simple mode without multi-geom), accept
        if (!activeFieldId) return true;
        return activeFieldId === this.fieldId;
    }

    /**
     * Checks if an edited/moved/deleted feature belongs to this layer by looking if its ID is in gmEvents.
     * @param {Object} event - The Geoman event
     * @return {boolean}
     * @private
     */
    _isFeatureOwnedByThisField(event) {
        const featureId = event?.feature?.id;
        if (!featureId) return false;
        return this.gmEvents.some(e => e.id === featureId);
    }

    /**
     * Hide the default Geoman marker for a point feature.
     * Geoman renders points via a MapLibre symbol layer (icon-image: "default-marker").
     * We render the default marker transparent (icon-opacity: 0) WITHOUT filtering it,
     * so that Geoman can still detect clicks/drags on the feature.
     * @param {Object} feature - The Geoman feature (FeatureData)
     * @private
     */
    _hideGeomanDefaultMarker(feature) {
        const featureId = feature.id;
        if (!featureId) return;

        // 1. Hide DOM markers (used during editing/drag)
        const doHideDom = (feat) => {
            if (feat && feat.markers && typeof feat.markers.forEach === 'function') {
                feat.markers.forEach((markerEntry) => {
                    const instance = markerEntry.instance || markerEntry;
                    if (instance && typeof instance.getElement === 'function') {
                        const el = instance.getElement();
                        if (el) {
                            el.style.opacity = '0';
                            el.style.pointerEvents = 'auto';
                        }
                    }
                });
            }
        };
        doHideDom(feature);

        // 2. Make the Geoman symbol layer transparent (but NOT filtered)
        // We use icon-opacity: 0 so that the marker remains in the layer
        // and Geoman can detect it for drag/edit/remove
        this._applySymbolLayerOpacity();
        setTimeout(() => this._applySymbolLayerOpacity(), 100);
        setTimeout(() => this._applySymbolLayerOpacity(), 500);

        // 3. Fallback: search for the feature in Geoman by ID for DOM markers (initial load)
        const gmApi = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
        const tryHideById = (attempts) => {
            if (attempts <= 0) return;
            if (gmApi && gmApi.features) {
                const allFeatures = gmApi.features.filter ? gmApi.features.filter(() => true) : [];
                const found = allFeatures.find(f => f.id === featureId);
                if (found) {
                    doHideDom(found);
                    return;
                }
            }
            setTimeout(() => tryHideById(attempts - 1), 200);
        };
        tryHideById(5);
    }

    /**
     * Makes Geoman symbol layers transparent (icon-opacity: 0) for features
     * that have a customIcon, WITHOUT filtering them. This allows Geoman to continue
     * to detect features for drag/edit/remove.
     * @private
     */
    _applySymbolLayerOpacity() {
        const style = this.map.getStyle();
        if (!style || !style.layers) return;

        style.layers.forEach(layer => {
            // Target Geoman symbol layers (those using default-marker)
            if (layer.type === 'symbol' && layer.layout && layer.layout['icon-image'] === 'default-marker') {
                try {
                    this.map.setPaintProperty(layer.id, 'icon-opacity', 0);
                    this.map.setPaintProperty(layer.id, 'text-opacity', 0);
                } catch (e) {
                    console.warn('MaplibreGeometryField: failed to set symbol layer opacity', layer.id, e);
                }
            }
        });
    }

    /**
     * Removes the default Geoman marker mask for a feature.
     * Note: as we use icon-opacity: 0 on the whole layer, this method
     * is a no-op for the symbol layer (we cannot restore per feature).
     * @param {string} featureId - The feature ID
     * @private
     */
    _unhideGeomanDefaultMarker(featureId) {
        // No-op for the symbol layer — the opacity is global to the layer
    }

    /**
     * Create a maplibregl DOM marker with the customIcon at the position of a point feature.
     * @param {Object} feature - The Geoman feature
"""
     * @private
     */
    _addCustomMarkerForFeature(feature) {
        const featureId = feature.id;
        if (!featureId) return;

        // Remove the old DOM marker if it exists
        this._removeCustomMarker(featureId);

        // Retrieve coordinates
        const geojson = this._getGeoJson(feature);
        if (!geojson) return;
        const geom = geojson.geometry || geojson;
        let coords;
        if (geom.type === 'Point') {
            coords = geom.coordinates;
        } else if (geom.type === 'MultiPoint' && geom.coordinates.length > 0) {
            coords = geom.coordinates[geom.coordinates.length - 1];
        } else {
            return;
        }

        // Hide Geoman DOM marker by default
        this._hideGeomanDefaultMarker(feature);

        // Créer l'élément DOM
        const el = document.createElement('div');
        el.innerHTML = this.options.customIcon;
        el.style.pointerEvents = 'none';

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(this.map);

        this._customMarkers[featureId] = marker;
    }

    /**
     * Updates the position of a custom DOM marker after a drag.
     * @param {Object} feature - The Geoman feature
     * @private
     */
    _updateCustomMarkerPosition(feature) {
        const featureId = feature.id;
        if (!featureId || !this._customMarkers[featureId]) return;

        const geojson = this._getGeoJson(feature);
        if (!geojson) return;
        const geom = geojson.geometry || geojson;
        let coords;
        if (geom.type === 'Point') {
            coords = geom.coordinates;
        } else if (geom.type === 'MultiPoint' && geom.coordinates.length > 0) {
            coords = geom.coordinates[geom.coordinates.length - 1];
        } else {
            return;
        }

        this._customMarkers[featureId].setLngLat(coords);
    }

    /**
     * Removes a custom DOM marker.
     * @param {string} featureId - The feature ID
     * @private
     */
    _removeCustomMarker(featureId) {
        if (this._customMarkers[featureId]) {
            this._customMarkers[featureId].remove();
            delete this._customMarkers[featureId];
        }
    }

    /**
     * Synchronizes the position of custom DOM markers with the current coordinates of Geoman features.
Called on each render frame to track real-time dragging.
     * @private
     */
    _syncCustomMarkersFromSource() {
        const markerIds = Object.keys(this._customMarkers);
        if (markerIds.length === 0) return;

        const sources = this._findAllGeomanSources();
        if (sources.length === 0) return;

        for (const id of markerIds) {
            const marker = this._customMarkers[id];
            if (!marker) continue;

            // Search for the feature in Geoman sources
            for (const source of sources) {
                const data = source._data;
                const features = (data?.geojson?.features) || (data?.features) || [];
                const feature = features.find(f => f.id == id);
                if (feature && feature.geometry) {
                    let coords;
                    if (feature.geometry.type === 'Point') {
                        coords = feature.geometry.coordinates;
                    } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
                        coords = feature.geometry.coordinates[feature.geometry.coordinates.length - 1];
                    }
                    if (coords) {
                        const currentLngLat = marker.getLngLat();
                        // Only update if the position has changed
                        if (currentLngLat.lng !== coords[0] || currentLngLat.lat !== coords[1]) {
                            marker.setLngLat(coords);
                        }
                    }
                    break;
                }
            }
        }
    }

    /**
     * Remove all custom DOM markers from this field.
     * @private
     */
    _removeAllCustomMarkers() {
        Object.keys(this._customMarkers).forEach(id => {
            this._customMarkers[id].remove();
        });
        this._customMarkers = {};
    }

    /**
     * Configure Geoman events for the creation, editing, and live tracking of geometries
     * @private
     */
    _setupGeomanEvents() {
        // Load initial geometry
        this._loadInitialGeometry();

        const registerGeomanHandlers = () => {
            if (this._geomanHandlersRegistered) return;
            this._geomanHandlersRegistered = true;
            const geoman = this.drawManager.getGeoman();
            // Check if Geoman is available
            if (!geoman) {
                console.error('Geoman instance is not available');
                return;
            }

            // Configure the drawing completion listener for custom buttons
            this.drawManager.setupDrawEndListener();

            // Drawing Start Event
            this.map.on('gm:globaldrawmodetoggled', (event) => {
                // Filter: only react to shapes that match this field AND check the active field
                if (!this._isShapeForThisField(event.shape)) return;
                if (!this._isActiveField()) return;
                try {
                    if (event.enabled) {
                        const geoman = this.drawManager.getGeoman();
                        const gmApi = this.map.gm || geoman;

                        // If we are in unique geometry mode, we do NOT delete here.
                        // The deletion of the old feature is done in gm:create,
                        // once the new feature is created, to avoid emptying gmEvents
                        // before gm:create can use them.
                        if (!this.options.isCollection) {
                            // Nothing to do here — deletion is handled in gm:create
                        } else {
                            // In collection mode, we might want to restrict certain buttons if needed,
                            // but here we let Geoman manage the addition of new features.
                        }

                        // Activate the appropriate drawing mode
                        if (event.shape === 'line') {
                            this.isDrawingLine = true;
                            this.isDrawingPolygon = false;
                            this.isDrawingRectangle = false;
                        } else if (event.shape === 'polygon') {
                            this.isDrawingLine = false;
                            this.isDrawingPolygon = true;
                            this.isDrawingRectangle = false;
                        } else if (event.shape === 'rectangle') {
                            this.isDrawingLine = false;
                            this.isDrawingPolygon = false;
                            this.isDrawingRectangle = true;
                        }

                        // Reset coordinates and create the popup
                        this.currentDrawingCoords = [];
                        this.rectangleStartCoord = null;

                        // Create the popup for measurements
                        if (!this.livePopup) {
                            this.livePopup = new maplibregl.Popup({
                                closeButton: false,
                                closeOnClick: false,
                                className: 'custom-popup',
                                anchor: 'left',
                                offset: 10
                            }).addTo(this.map);
                        }

                        // Disable drawing mode after creation
                        if(this.options.isPoint || this.options.isPolygon || this.options.isLineString) {
                            // Nothing is being done here at the moment because we want Geoman to finish its creation
                            // We have already handled the deletion of old features at the beginning (gm:globaldrawmodetoggled)
                            // and we also handle it at the end (gm:create)
                        }
                    } else {
                        // Stop tracking when drawing mode is disabled
                        if (event.shape === 'line' || event.shape === 'polygon' || event.shape === 'rectangle') {
                            this._stopLiveDrawingTracking();
                        }
                    }

                } catch(error) {
                    console.error('Error during global draw mode toggle:', error);
                }
            });

            // Real-time tracking event during drawing
            this.map.on('_gm:draw', (event) => {
                if (!this._isShapeForThisField(event.mode)) return;
                if (!this._isActiveField()) return;
                try {
                    if (event.mode === 'line' || event.mode === 'polygon' || event.mode === 'rectangle') {
                        this._handleLiveDrawing(event);
                    }
                } catch (error) {
                    console.error('Error during live drawing event:', error);
                }
            });

            // Geometry Creation Event
            this.map.on('gm:create', (event) => {
                // Filter: only react to shapes that match this field AND check the active field
                if (!this._isShapeForThisField(event.shape)) return;
                if (!this._isActiveField()) return;
                try {
                    // Ensure that the feature has an ID before processing
                    if (event.feature && !event.feature.id) {
                        const newId = generateUniqueId();
                        event.feature.id = newId;
                    }

                    // If single mode (not collection/generic), delete old features BEFORE processing the new one
                    // This ensures that we keep only one feature at a time
                    if (!this.options.isCollection && event.feature) {
                        const newFeatureId = event.feature.id;

                        // We retrieve the complete GeoJSON to pass it to the fallback if needed
                        let featureGeoJson = this._getGeoJson(event.feature);
                        if (!featureGeoJson && event.feature && event.feature.type === 'Feature') {
                             featureGeoJson = event.feature;
                        }
                        // Ensure the ID is present
                        if (featureGeoJson && !featureGeoJson.id) featureGeoJson.id = newFeatureId;

                        // Remove old features from this field (gmEvents still contains the old ones)
                        this._removeAllGeomanFeatures(featureGeoJson);

                        // Remove old custom DOM markers (except the one for the new feature)
                        if (this.options.customIcon) {
                            Object.keys(this._customMarkers).forEach(id => {
                                if (id != newFeatureId) {
                                    this._removeCustomMarker(id);
                                }
                            });
                        }

                        // Clear gmEvents AFTER deletion, keep only the new feature
                        this.gmEvents = [];
                    }

                    // Now we process and save the geometry (with only the new feature for simple types)
                    this._processAndSaveGeometry(event);

                    // Add a custom DOM marker if customIcon is defined
                    if (this.options.customIcon && event.shape === 'marker' && event.feature) {
                        this._addCustomMarkerForFeature(event.feature);
                    }

                    // Reset coordinates for the next shape if still in drawing mode
                    if ((event.shape === 'line' && this.isDrawingLine) ||
                        (event.shape === 'polygon' && this.isDrawingPolygon) ||
                        (event.shape === 'rectangle' && this.isDrawingRectangle)) {
                        this._resetDrawingCoords();
                    }

                    // Disable drawing mode after creation
                    if(!this.options.isCollection) {
                        const gm = this.map.gm || (this.drawManager && this.drawManager.getGeoman());
                        if (gm && gm.disableDraw) {
                            gm.disableDraw();
                            // Force a second time to be sure the UI follows
                            setTimeout(() => gm.disableDraw(), 50);
                        }
                        this._stopLiveDrawingTracking();
                    }

                } catch (error) {
                    console.error('Error during feature creation:', error);
                }
            });

            // Event for the end of the edition
            this.map.on('gm:editend', (event) => {
                if (!this._isFeatureOwnedByThisField(event)) return;
                try {
                    this._processAndSaveGeometry(event);
                    // Update the position of the custom DOM marker
                    if (this.options.customIcon && event.feature) {
                        this._updateCustomMarkerPosition(event.feature);
                    }
                } catch (error) {
                    console.error('Error during feature edit:', error);
                }
            });

            // End of trip event
            this.map.on('gm:dragend', (event) => {
                if (!this._isFeatureOwnedByThisField(event)) return;
                try {
                    this._processAndSaveGeometry(event);
                    // Update custom DOM marker position
                    if (this.options.customIcon && event.feature) {
                        this._updateCustomMarkerPosition(event.feature);
                    }
                } catch (error) {
                    console.error('Error during feature drag:', error);
                }
            });

            // Real-time drag tracking for markers with customIcon
            // We listen for 'render' to update the position of custom markers
            // by reading coordinates from the Geoman source on each frame.
            if (this.options.customIcon) {
                this.map.on('render', () => {
                    this._syncCustomMarkersFromSource();
                });
            }

            // Geometry deletion event
            this.map.on('gm:remove', (event) => {
                if (!this._isFeatureOwnedByThisField(event)) return;
                try {
                    // Remove custom DOM marker
                    if (event.feature && event.feature.id) {
                        this._removeCustomMarker(event.feature.id);
                    }
                    this._processAndSaveGeometry(event);
                } catch (error) {
                    console.error('Error during feature removal:', error);
                }
            });

            // Manage clicks only during drawing
            this.map.on('click', (event) => {
                try {
                    this._handleDrawingClick(event);
                } catch(error) {
                    console.error('Error during click event:', error);
                }
            });

            // Initialize external layer snapping if configured
            this._initExternalSnapping();
        };

        if (this.map.gm) {
            registerGeomanHandlers();
        }
        this.map.on("gm:loaded", registerGeomanHandlers);
    }

    /**
     * Initialize external layer snapping based on the snappingConfig option
     * passed from the MapWidget.
     * Adds transparent vector tile layers for each snap target and wires up
     * the Geoman custom snapping coordinates API via enableExternalLayerSnapping.
     * @private
     */
    _initExternalSnapping() {
        if (typeof enableExternalLayerSnapping !== 'function') {
            return;
        }
        const cfg = this.options.snappingConfig;
        if (!cfg || !cfg.enabled) {
            return;
        }

        const snapDistance = cfg.snapDistance || 18;
        const snapLayers = cfg.snapLayers || [];
        const map = this.map;
        const geoman = map.gm || (this.drawManager && this.drawManager.getGeoman());

        const layerIds = [];

        const addSnapLayer = async (snapLayer) => {
            const sourceId = 'mapentity-snap-source-' + snapLayer.id;
            const layerId = 'mapentity-snap-layer-' + snapLayer.id;

            if (map.getSource(sourceId)) {
                layerIds.push(layerId);
                return;
            }

            try {
                const response = await fetch(snapLayer.tilejsonUrl);
                if (!response.ok) return;
                const tilejson = await response.json();
                const tiles = tilejson.tiles || [];
                if (!tiles.length) return;

                map.addSource(sourceId, {
                    type: 'vector',
                    tiles: tiles,
                    minzoom: tilejson.minzoom || 0,
                    maxzoom: tilejson.maxzoom || 22,
                });

                // Add a transparent line layer so features are queryable
                map.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    'source-layer': snapLayer.id,
                    paint: {
                        'line-opacity': 0,
                        'line-width': 1,
                    },
                });

                layerIds.push(layerId);
            } catch (e) {
                console.warn('MaplibreGeometryField: failed to add snap layer', snapLayer.id, e);
            }
        };

        Promise.all(snapLayers.map(addSnapLayer)).then(() => {
            if (!layerIds.length) return;
            const resolvedGeoman = map.gm || (this.drawManager && this.drawManager.getGeoman());

            // Activate Geoman's snapping helper so it's present in actionInstances.
            // The helper is only added to actionInstances when the mode is active;
            // with active:false in the initial options it is never started.
            if (resolvedGeoman && resolvedGeoman.options && resolvedGeoman.options.enableMode) {
                resolvedGeoman.options.enableMode("helper", "snapping");
            }

            enableExternalLayerSnapping(map, resolvedGeoman, {
                layerIds: layerIds,
                snapRadius: snapDistance * 2,
                densifyGapPx: 4,
            });
        });
    }
}