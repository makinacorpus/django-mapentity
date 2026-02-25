/**
 * mapentity.snapping.js
 *
 * External layer snapping utility for Geoman on MapLibre GL JS.
 *
 * Uses Geoman's setCustomSnappingCoordinates API to inject vertex
 * coordinates from external MapLibre vector tile layers so that
 * drawing/editing tools snap to those features.
 *
 * Line snapping is simulated by densifying segment coordinates
 * (interpolating intermediate points) before injection.
 */

/**
 * Interpolate points along a line segment at regular pixel intervals.
 *
 * @param {maplibregl.Map} map
 * @param {number[]} coord0 - [lng, lat] of segment start
 * @param {number[]} coord1 - [lng, lat] of segment end
 * @param {number} gapPx    - interpolation gap in pixels
 * @returns {number[][]}    - array of [lng, lat] intermediate points
 */
function densifySegment(map, coord0, coord1, gapPx) {
    const p0 = map.project(coord0);
    const p1 = map.project(coord1);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    if (distPx <= gapPx) {
        return [];
    }
    const steps = Math.floor(distPx / gapPx);
    const points = [];
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = p0.x + t * dx;
        const py = p0.y + t * dy;
        const lngLat = map.unproject([px, py]);
        points.push([lngLat.lng, lngLat.lat]);
    }
    return points;
}

/**
 * Extract all [lng, lat] coordinates from a GeoJSON geometry,
 * densifying line segments to simulate line snapping.
 *
 * @param {maplibregl.Map} map
 * @param {Object} geometry  - GeoJSON geometry object
 * @param {number} gapPx     - densification gap in pixels
 * @returns {number[][]}     - flat array of [lng, lat] coordinates
 */
function extractAndDensifyCoords(map, geometry, gapPx) {
    const coords = [];

    function processRing(ring) {
        for (let i = 0; i < ring.length; i++) {
            coords.push(ring[i]);
            if (i < ring.length - 1) {
                const extra = densifySegment(map, ring[i], ring[i + 1], gapPx);
                extra.forEach(c => coords.push(c));
            }
        }
    }

    function processGeometry(geom) {
        if (!geom) return;
        switch (geom.type) {
            case 'Point':
                coords.push(geom.coordinates);
                break;
            case 'MultiPoint':
                geom.coordinates.forEach(c => coords.push(c));
                break;
            case 'LineString':
                processRing(geom.coordinates);
                break;
            case 'MultiLineString':
                geom.coordinates.forEach(ring => processRing(ring));
                break;
            case 'Polygon':
                geom.coordinates.forEach(ring => processRing(ring));
                break;
            case 'MultiPolygon':
                geom.coordinates.forEach(poly => poly.forEach(ring => processRing(ring)));
                break;
            case 'GeometryCollection':
                (geom.geometries || []).forEach(g => processGeometry(g));
                break;
        }
    }

    processGeometry(geometry);
    return coords;
}

/**
 * Enable snapping to external MapLibre layers using Geoman's
 * custom snapping coordinates API.
 *
 * @param {maplibregl.Map} map        - The MapLibre map instance
 * @param {Object} geoman             - The Geoman instance (window.gm or equivalent)
 * @param {Object} options
 * @param {string[]} options.layerIds   - MapLibre layer IDs to query for snap targets
 * @param {number}  options.snapRadius  - Query bbox half-size in pixels (default: 50)
 * @param {number}  options.densifyGapPx - Gap for densification in pixels (default: 4)
 * @returns {Function} cleanup - Call this to remove the listener and clear coords
 */
function enableExternalLayerSnapping(map, geoman, options) {
    const layerIds = options.layerIds || [];
    const snapRadius = options.snapRadius || 50;
    const densifyGapPx = options.densifyGapPx || 4;
    const SNAP_KEY = 'mapentity_external';

    if (!layerIds.length) {
        return function() {};
    }

    function getSnappingHelper() {
        return geoman &&
            geoman.actionInstances &&
            geoman.actionInstances['helper__snapping'];
    }

    function onMouseMove(e) {
        const helper = getSnappingHelper();
        if (!helper) return;

        const point = e.point;
        const bbox = [
            [point.x - snapRadius, point.y - snapRadius],
            [point.x + snapRadius, point.y + snapRadius],
        ];

        const features = map.queryRenderedFeatures(bbox, { layers: layerIds });

        if (!features || features.length === 0) {
            if (helper.clearCustomSnappingCoordinates) {
                helper.clearCustomSnappingCoordinates(SNAP_KEY);
            }
            return;
        }

        const allCoords = [];
        features.forEach(function(feature) {
            if (feature.geometry) {
                const coords = extractAndDensifyCoords(map, feature.geometry, densifyGapPx);
                coords.forEach(c => allCoords.push(c));
            }
        });

        if (allCoords.length > 0) {
            helper.setCustomSnappingCoordinates(SNAP_KEY, allCoords);
        } else {
            if (helper.clearCustomSnappingCoordinates) {
                helper.clearCustomSnappingCoordinates(SNAP_KEY);
            }
        }
    }

    map.on('mousemove', onMouseMove);

    return function cleanup() {
        map.off('mousemove', onMouseMove);
        const helper = getSnappingHelper();
        if (helper && helper.clearCustomSnappingCoordinates) {
            helper.clearCustomSnappingCoordinates(SNAP_KEY);
        }
    };
}
