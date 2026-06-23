class MaplibreMeasureControl {
    /**
     * Measurement control for MapLibre GL JS with real-time display.
     */
    constructor() {
        this._map = null;
        this._container = null;
        this._drawing = false;
        this._measureCompleted = false; // New: indicates if a measurement is complete
        this._geojson = {
            type: 'FeatureCollection',
            features: []
        };
        this._linestring = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: []
            }
        };
        // New line for real-time display
        this._liveLinestring = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: []
            }
        };
        this._button = null;
        this._currentMousePosition = null;
        this._livePopup = null;
        this._finalPopup = null;
        this._lastClickTime = 0;
        this._lastClickPoint = null;
        this._doubleClickThreshold = 500; // 500ms to detect the double-click
        this._completedLines = []; // New: stores completed lines
    }

    /**
     * Add the measurement control to the MapLibre map.
     * @param map {maplibregl.Map} - The MapLibre map instance to which the control is added.
     * @returns {HTMLElement} - Returns the measurement control container.
     */
    onAdd(map) {
        this._map = map;

        // Container creation
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        // Button creation
        this._button = document.createElement('button');
        this._button.setAttribute('type', 'button');
        this._button.setAttribute('title', gettext('Measure a distance'));
        this._button.className = 'measure-control-btn';

        const img = document.createElement('img');
        img.src = '/static/mapentity/images/regle.png';
        img.alt = 'Measure Tool';
        img.style.width = '25px';
        img.style.height = '25px';
        this._button.appendChild(img);

        this._container.appendChild(this._button);

        // Création des popups
        this._livePopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'custom-popup',
            anchor: 'left',
            offset: 10
        }).addTo(this._map);

        this._finalPopup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup-final',
            anchor: 'left',
            offset: 10
        });

        const onClick = (e) => this._onClick(e);
        const onMouseMove = (e) => this._onMouseMove(e);

        // Toggle draw
        this._button.onclick = () => {
            // If a measurement is finished, we reset everything to zero
            if (this._measureCompleted) {
                this._resetAll();
                return;
            }

            this._drawing = !this._drawing;

            if (this._drawing) {
                this._map.getCanvas().style.cursor = 'crosshair';
                this._map.on('click', onClick);
                this._map.on('mousemove', onMouseMove);

                // Activate visual style
                this._button.classList.add('measure-control-btn-active');
                this._button.setAttribute('title', gettext('Stop measurement'));
            } else {
                this._map.getCanvas().style.cursor = '';
                this._map.off('click', onClick);
                this._map.off('mousemove', onMouseMove);
                this._finishMeasure();

                // remove active style
                this._button.classList.remove('measure-control-btn-active');
                this._button.setAttribute('title', gettext('Measure a distance'));
            }
        };

        this._map.on('load', () => {
            this._map.addSource('geojson', {
                type: 'geojson',
                data: this._geojson
            });

            this._map.addLayer({
                id: 'measure-points',
                type: 'circle',
                source: 'geojson',
                paint: {
                    'circle-radius': 5,
                    'circle-color': '#000'
                },
                filter: ['in', '$type', 'Point']
            });

            this._map.addLayer({
                id: 'measure-lines',
                type: 'line',
                source: 'geojson',
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                paint: {
                    'line-color': '#000',
                    'line-width': 2.5,
                },
                filter: ['in', '$type', 'LineString']
            });

            // New layer for the real-time line
            this._map.addLayer({
                id: 'measure-live-line',
                type: 'line',
                source: 'geojson',
                filter: ['==', ['get', 'live'], true]
            });

            // Layer for completed lines
            this._map.addLayer({
                id: 'measure-completed-lines',
                type: 'line',
                source: 'geojson',
                filter: ['==', ['get', 'completed'], true]
            });
        });

        return this._container;
    }

    /**
     * Handles map click to add measurement points.
     * @param e {Object} - The click event containing the coordinates of the clicked point.
     * @private
     */
    _onClick(e) {
        // If a measurement is complete, clicks are ignored
        if (this._measureCompleted) {
            return;
        }

        const currentTime = Date.now();
        const clickedCoords = [e.lngLat.lng, e.lngLat.lat];

        // Double-click verification on the last point
        if (this._lastClickPoint &&
            currentTime - this._lastClickTime < this._doubleClickThreshold &&
            this._getDistance(clickedCoords, this._lastClickPoint) < 0.01) { // Very small distance to consider as the same point

            this._completeMeasure(clickedCoords);
            return;
        }

        // Delete the existing live and main lines
        this._geojson.features = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' || feature.properties?.completed
        );

        // Add the new point
        const point = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: clickedCoords
            },
            properties: {
                id: String(Date.now())
            }
        };
        this._geojson.features.push(point);

        // Updates the main line if there are points
        this._updateMainLine();
        this._map.getSource('geojson').setData(this._geojson);

        // Backup for double-click detection
        this._lastClickTime = currentTime;
        this._lastClickPoint = clickedCoords;
    }

    /**
     * Calculate the distance between two coordinates.
     * @param coord1 {Array} - First coordinate [lng, lat]
     * @param coord2 {Array} - Second coordinate [lng, lat]
     * @returns {number} - Distance in kilometers
     * @private
     */
    _getDistance(coord1, coord2) {
        const line = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [coord1, coord2]
            }
        };
        return turf.length(line);
    }

    /**
     * Terminate the measurement with a double-click.
     * @param coords {Array} - Coordinates of the endpoint
     * @private
     */
    _completeMeasure(coords) {
        // Hide live popup
        this._livePopup.remove();

        // Calculate the final distance
        const points = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' && !feature.properties?.completed
        );
        let finalDistance = 0;

        if (points.length > 1) {
            const mainLine = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(point => point.geometry.coordinates)
                }
            };
            finalDistance = turf.length(mainLine);

            // Save the completed line
            const completedLine = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(point => point.geometry.coordinates)
                },
                properties: {
                    completed: true,
                    distance: finalDistance,
                    id: String(Date.now())
                }
            };

            this._completedLines.push(completedLine);
        }

        // Display the final popup next to the last point
        const formattedMessage = `Distance finale: ${finalDistance.toLocaleString()} km<br><small>Cliquer sur le bouton pour recommencer</small>`;
        this._finalPopup
            .setLngLat(coords)
            .setHTML(formattedMessage)
            .addTo(this._map);

        // Mark the measurement as complete
        this._measureCompleted = true;
        this._drawing = false;

        // Disable events
        this._map.getCanvas().style.cursor = '';
        this._map.off('click', this._onClick);
        this._map.off('mousemove', this._onMouseMove);

        // Updates the display
        this._updateCompletedDisplay();

        // Change the button's style to indicate that it can be restarted
        this._button.classList.remove('measure-control-btn-active');
        this._button.classList.add('measure-control-btn-reset');
        this._button.setAttribute('title', gettext('Delete everything and start over'));
    }

    /**
     * Updates the display with completed lines.
     * @private
     */
    _updateCompletedDisplay() {
        // Remove temporary drawing elements
        this._geojson.features = this._geojson.features.filter(
            feature => feature.properties?.completed
        );

        // Add all finished lines
        this._completedLines.forEach(line => {
            this._geojson.features.push(line);
        });

        this._map.getSource('geojson').setData(this._geojson);
    }

    /**
     * Reset everything to start over.
     * @private
     */
    _resetAll() {
        // Reset all states
        this._measureCompleted = false;
        this._drawing = false;
        this._completedLines = [];
        this._geojson.features = [];
        this._linestring.geometry.coordinates = [];
        this._liveLinestring.geometry.coordinates = [];
        this._currentMousePosition = null;
        this._lastClickPoint = null;
        this._lastClickTime = 0;

        // Updates the display
        if (this._map.getSource('geojson')) {
            this._map.getSource('geojson').setData(this._geojson);
        }

        // Hide popups
        this._livePopup.remove();
        this._finalPopup.remove();

        // Recreate the livePopup if needed
        this._livePopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'custom-popup',
            anchor: 'left',
            offset: 10
        }).addTo(this._map);

        // Return the button to its initial state
        this._button.classList.remove('measure-control-btn-active', 'measure-control-btn-reset');
        this._button.setAttribute('title', gettext('Measure a distance'));
        this._map.getCanvas().style.cursor = '';
    }

    /**
     * Updates the main line between the clicked points.
     * @private
     */
    _updateMainLine() {
        const currentPoints = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' && !feature.properties?.completed
        );

        if (currentPoints.length > 1) {
            const coordinates = currentPoints.map(point => point.geometry.coordinates);

            this._linestring.geometry.coordinates = coordinates;
            this._geojson.features.push(this._linestring);

            const distance = turf.length(this._linestring);
            this._updateLiveDistance(distance, false);
        }
    }

    /**
     * Manages the mouse movement on the map during drawing.
     * @param e {Object} - The mouse movement event containing the coordinates.
     * @private
     */
    _onMouseMove(e) {
        if (this._drawing && !this._measureCompleted) {
            this._map.getCanvas().style.cursor = 'crosshair';
            this._currentMousePosition = [e.lngLat.lng, e.lngLat.lat];

            // Updates the live line
            this._updateLiveLine();
        }
    }

    /**
     * Updates the live line that follows the mouse.
     * @private
     */
    _updateLiveLine() {
        if (!this._currentMousePosition || this._measureCompleted) {
            return;
        }

        const points = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' && !feature.properties?.completed
        );

        if (points.length > 0) {
            // Deletes old lines (main and live) but keeps completed lines
            this._geojson.features = this._geojson.features.filter(
                feature => feature.geometry.type === 'Point' || feature.properties?.completed
            );

            // Creates the main line between the clicked points
            if (points.length > 1) {
                const mainCoordinates = points.map(point => point.geometry.coordinates);
                const mainLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: mainCoordinates
                    },
                    properties: {
                        live: false
                    }
                };
                this._geojson.features.push(mainLine);
            }

            // Create the live line from the last point to the mouse
            const lastPoint = points[points.length - 1];
            const liveCoordinates = [
                lastPoint.geometry.coordinates,
                this._currentMousePosition
            ];

            this._liveLinestring.geometry.coordinates = liveCoordinates;
            this._liveLinestring.properties = { live: true };
            this._geojson.features.push(this._liveLinestring);

            // Calculate the total distance (clicked points + live line)
            let totalDistance = 0;

            if (points.length > 1) {
                const mainLine = {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: points.map(point => point.geometry.coordinates)
                    }
                };
                totalDistance += turf.length(mainLine);
            }

            // Add the live line distance
            const liveDistance = turf.length(this._liveLinestring);
            totalDistance += liveDistance;

            this._updateLiveDistance(totalDistance, true);
            this._map.getSource('geojson').setData(this._geojson);

            // Updates the live popup position
            this._livePopup.setLngLat(this._currentMousePosition);
        }
    }

    /**
     * Updates the real-time distance display.
     * @param distance {number} - The total distance measured in kilometers.
     * @param isLive {boolean} - Indicates if it is a real-time display.
     * @private
     */
    _updateLiveDistance(distance, isLive = false) {
        const points = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' && !feature.properties?.completed
        );
        const pointCount = points.length;

        let formattedDistance = '';
        let message = '';

        if (distance > 0) {
            formattedDistance = `${gettext("Total distance:")} ${distance.toLocaleString()} km`;
        }

        if (pointCount === 0) {
            message = gettext('Click to start drawing the line');
        } else if (pointCount === 1) {
            message = formattedDistance + '<br>' + gettext('Click to continue drawing the line');
        } else if (pointCount === 2) {
            message = formattedDistance + '<br>' + gettext('Click to continue drawing the line');
        } else {
            message = formattedDistance + '<br>' + gettext('Double-click the last point to end the line');
        }

        this._livePopup.setHTML(message);
    }

    /**
     * End the measurement by resetting the temporary data.
     * @private
     */
    _finishMeasure() {
        // Only resets temporary data, not completed lines
        this._geojson.features = this._geojson.features.filter(
            feature => feature.properties?.completed
        );

        this._linestring.geometry.coordinates = [];
        this._liveLinestring.geometry.coordinates = [];
        this._currentMousePosition = null;
        this._lastClickPoint = null;
        this._lastClickTime = 0;

        if (this._map.getSource('geojson')) {
            this._map.getSource('geojson').setData(this._geojson);
        }

        // Cache only the live popup
        this._livePopup.remove();
    }
}