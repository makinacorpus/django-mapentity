class MaplibreMeasureControl {
    /**
     * Contrôle de mesure pour MapLibre GL JS avec affichage en temps réel.
     */
    constructor() {
        this._map = null;
        this._container = null;
        this._drawing = false;
        this._measureCompleted = false; // Nouveau: indique si une mesure est terminée
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
        // Nouvelle ligne pour l'affichage en temps réel
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
        this._doubleClickThreshold = 500; // 500ms pour détecter le double-clic
        this._completedLines = []; // Nouveau: stocke les lignes terminées
    }

    /**
     * Ajoute le contrôle de mesure à la carte MapLibre.
     * @param map {maplibregl.Map} - L'instance de la carte MapLibre à laquelle ajouter le contrôle.
     * @returns {HTMLElement} - Retourne le conteneur du contrôle de mesure.
     */
    onAdd(map) {
        this._map = map;

        // Création du conteneur
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        // Création du bouton
        this._button = document.createElement('button');
        this._button.setAttribute('type', 'button');
        this._button.setAttribute('title', 'Mesurer une distance');
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

        // Toggle dessin
        this._button.onclick = () => {
            // Si une mesure est terminée, on remet tout à zéro
            if (this._measureCompleted) {
                this._resetAll();
                return;
            }

            this._drawing = !this._drawing;

            if (this._drawing) {
                this._map.getCanvas().style.cursor = 'crosshair';
                this._map.on('click', onClick);
                this._map.on('mousemove', onMouseMove);

                // Active le style visuel
                this._button.classList.add('measure-control-btn-active');
                this._button.setAttribute('title', 'Arrêter la mesure');
            } else {
                this._map.getCanvas().style.cursor = '';
                this._map.off('click', onClick);
                this._map.off('mousemove', onMouseMove);
                this._finishMeasure();

                // Retire le style actif
                this._button.classList.remove('measure-control-btn-active');
                this._button.setAttribute('title', 'Mesurer une distance');
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

            // Nouvelle couche pour la ligne en temps réel
            this._map.addLayer({
                id: 'measure-live-line',
                type: 'line',
                source: 'geojson',
                filter: ['==', ['get', 'live'], true]
            });

            // Couche pour les lignes terminées
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
     * Gère le clic sur la carte pour ajouter des points de mesure.
     * @param e {Object} - L'événement de clic contenant les coordonnées du point cliqué.
     * @private
     */
    _onClick(e) {
        // Si une mesure est terminée, on ignore les clics
        if (this._measureCompleted) {
            return;
        }

        const currentTime = Date.now();
        const clickedCoords = [e.lngLat.lng, e.lngLat.lat];

        // Vérification du double-clic sur le dernier point
        if (this._lastClickPoint &&
            currentTime - this._lastClickTime < this._doubleClickThreshold &&
            this._getDistance(clickedCoords, this._lastClickPoint) < 0.01) { // Distance très petite pour considérer comme même point

            this._completeMeasure(clickedCoords);
            return;
        }

        // Supprime la ligne live et la ligne principale existante
        this._geojson.features = this._geojson.features.filter(
            feature => feature.geometry.type === 'Point' || feature.properties?.completed
        );

        // Ajoute le nouveau point
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

        // Met à jour la ligne principale si on a des points
        this._updateMainLine();
        this._map.getSource('geojson').setData(this._geojson);

        // Sauvegarde pour la détection du double-clic
        this._lastClickTime = currentTime;
        this._lastClickPoint = clickedCoords;
    }

    /**
     * Calcule la distance entre deux coordonnées.
     * @param coord1 {Array} - Première coordonnée [lng, lat]
     * @param coord2 {Array} - Deuxième coordonnée [lng, lat]
     * @returns {number} - Distance en kilomètres
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
     * Termine la mesure avec un double-clic.
     * @param coords {Array} - Coordonnées du point final
     * @private
     */
    _completeMeasure(coords) {
        // Cache la popup live
        this._livePopup.remove();

        // Calcule la distance finale
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

            // Sauvegarde la ligne terminée
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

        // Affiche la popup finale à côté du dernier point
        const formattedMessage = `Distance finale: ${finalDistance.toLocaleString()} km<br><small>Cliquer sur le bouton pour recommencer</small>`;
        this._finalPopup
            .setLngLat(coords)
            .setHTML(formattedMessage)
            .addTo(this._map);

        // Marque la mesure comme terminée
        this._measureCompleted = true;
        this._drawing = false;

        // Désactive les événements
        this._map.getCanvas().style.cursor = '';
        this._map.off('click', this._onClick);
        this._map.off('mousemove', this._onMouseMove);

        // Met à jour l'affichage
        this._updateCompletedDisplay();

        // Change le style du bouton pour indiquer qu'on peut recommencer
        this._button.classList.remove('measure-control-btn-active');
        this._button.classList.add('measure-control-btn-reset');
        this._button.setAttribute('title', 'Supprimer tout et recommencer');
    }

    /**
     * Met à jour l'affichage avec les lignes terminées.
     * @private
     */
    _updateCompletedDisplay() {
        // Supprime les éléments temporaires de dessin
        this._geojson.features = this._geojson.features.filter(
            feature => feature.properties?.completed
        );

        // Ajoute toutes les lignes terminées
        this._completedLines.forEach(line => {
            this._geojson.features.push(line);
        });

        this._map.getSource('geojson').setData(this._geojson);
    }

    /**
     * Remet tout à zéro pour recommencer.
     * @private
     */
    _resetAll() {
        // Réinitialise tous les états
        this._measureCompleted = false;
        this._drawing = false;
        this._completedLines = [];
        this._geojson.features = [];
        this._linestring.geometry.coordinates = [];
        this._liveLinestring.geometry.coordinates = [];
        this._currentMousePosition = null;
        this._lastClickPoint = null;
        this._lastClickTime = 0;

        // Met à jour l'affichage
        if (this._map.getSource('geojson')) {
            this._map.getSource('geojson').setData(this._geojson);
        }

        // Cache les popups
        this._livePopup.remove();
        this._finalPopup.remove();

        // Recrée le livePopup si besoin
        this._livePopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'custom-popup',
            anchor: 'left',
            offset: 10
        }).addTo(this._map);

        // Remet le bouton dans son état initial
        this._button.classList.remove('measure-control-btn-active', 'measure-control-btn-reset');
        this._button.setAttribute('title', 'Mesurer une distance');
        this._map.getCanvas().style.cursor = '';
    }

    /**
     * Met à jour la ligne principale entre les points cliqués.
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
     * Gère le mouvement de la souris sur la carte pendant le dessin.
     * @param e {Object} - L'événement de mouvement de la souris contenant les coordonnées.
     * @private
     */
    _onMouseMove(e) {
        if (this._drawing && !this._measureCompleted) {
            this._map.getCanvas().style.cursor = 'crosshair';
            this._currentMousePosition = [e.lngLat.lng, e.lngLat.lat];

            // Met à jour la ligne live
            this._updateLiveLine();
        }
    }

    /**
     * Met à jour la ligne live qui suit la souris.
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
            // Supprime les anciennes lignes (principale et live) mais garde les lignes terminées
            this._geojson.features = this._geojson.features.filter(
                feature => feature.geometry.type === 'Point' || feature.properties?.completed
            );

            // Crée la ligne principale entre les points cliqués
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

            // Crée la ligne live du dernier point à la souris
            const lastPoint = points[points.length - 1];
            const liveCoordinates = [
                lastPoint.geometry.coordinates,
                this._currentMousePosition
            ];

            this._liveLinestring.geometry.coordinates = liveCoordinates;
            this._liveLinestring.properties = { live: true };
            this._geojson.features.push(this._liveLinestring);

            // Calcule la distance totale (points cliqués + ligne live)
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

            // Ajoute la distance de la ligne live
            const liveDistance = turf.length(this._liveLinestring);
            totalDistance += liveDistance;

            this._updateLiveDistance(totalDistance, true);
            this._map.getSource('geojson').setData(this._geojson);

            // Met à jour la position de la popup live
            this._livePopup.setLngLat(this._currentMousePosition);
        }
    }

    /**
     * Met à jour l'affichage de la distance en temps réel.
     * @param distance {number} - La distance totale mesurée en kilomètres.
     * @param isLive {boolean} - Indique si c'est un affichage en temps réel.
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
            formattedDistance = `Distance totale: ${distance.toLocaleString()} km`;
        }

        if (pointCount === 0) {
            message = 'Cliquer pour commencer le dessin de la ligne';
        } else if (pointCount === 1) {
            message = formattedDistance + '<br>Cliquer pour continuer le dessin de la ligne';
        } else if (pointCount === 2) {
            message = formattedDistance + '<br>Cliquer pour continuer le dessin de la ligne';
        } else {
            message = formattedDistance + '<br>Double-cliquer sur le dernier point pour terminer la ligne';
        }

        this._livePopup.setHTML(message);
    }

    /**
     * Termine la mesure en réinitialisant les données temporaires.
     * @private
     */
    _finishMeasure() {
        // Ne remet à zéro que les données temporaires, pas les lignes terminées
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

        // Cache seulement la popup live
        this._livePopup.remove();
    }
}