/**
 * Tests for snapping functionality on the Road layer.
 *
 * The RoadForm defines snapping_config on its MapWidget:
 *   { enabled: True, layers: ["test_app.Road"], snap_distance: 20 }
 *
 * When creating/editing a Road, the MapWidget injects the resolved snapping
 * config into the JS options, which loads a transparent vector-tile snap layer
 * for existing Roads and wires up Geoman's custom snapping coordinates so that
 * new vertices snap to nearby existing road geometries.
 */
describe('Road snapping', () => {
    let roadId;

    before(() => {
        // Create a first Road so there is something to snap to.
        cy.login();
        cy.mockTiles();
        cy.visit('/road/add/');
        cy.get('input[name="name"]', {timeout: 10000}).clear().type('Snap Target Road');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();
        cy.get('#id_geom_draw_line').click();
        cy.get('.maplibregl-canvas').click(200, 200);
        cy.get('.maplibregl-canvas').click(300, 200, {force: true});
        cy.get('.maplibregl-canvas').click(400, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal('LineString');
        });
        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/road/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/road\/(\d+)\//);
            if (match) {
                roadId = match[1];
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should have data-modelname attribute set to road on the add page', () => {
        cy.visit('/road/add/');
        cy.get('body', {timeout: 10000}).should('have.attr', 'data-modelname', 'road');
    });

    it('should have snappingConfig in the widget options', () => {
        cy.visit('/road/add/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // The snapping config is injected by the MapWidget template into the
        // MaplibreGeometryField options. We can verify it was parsed by
        // checking that the snap source was added to the map.
        cy.window({timeout: 15000}).should((win) => {
            const map = win.mapentity_map;
            expect(map, 'window.mapentity_map').to.exist;
        });
    });

    it('should add snap source and layer to the map', {retries: 3}, () => {
        cy.visit('/road/add/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // The snap source/layer id is built from the model name:
        // "mapentity-snap-source-road" / "mapentity-snap-layer-road"
        cy.window({timeout: 15000}).should((win) => {
            const map = win.mapentity_map;
            expect(map, 'window.mapentity_map').to.exist;
            expect(map.getSource('mapentity-snap-source-road'), 'snap source').to.exist;
            expect(map.getLayer('mapentity-snap-layer-road'), 'snap layer').to.exist;
        });
    });

    it('should activate Geoman snapping helper', {retries: 3}, () => {
        cy.visit('/road/add/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // The snapping helper should be present in Geoman's actionInstances
        cy.window({timeout: 15000}).should((win) => {
            expect(win.gm, 'window.gm').to.exist;
            expect(win.gm.actionInstances, 'actionInstances').to.exist;
            expect(win.gm.actionInstances['helper__snapping'], 'snapping helper').to.exist;
        });
    });

    it('should have setCustomSnappingCoordinates available when drawing', {retries: 3}, () => {
        cy.visit('/road/add/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // Wait for snap source to be ready
        cy.window({timeout: 15000}).should((win) => {
            const map = win.mapentity_map;
            expect(map, 'window.mapentity_map').to.exist;
            expect(map.getSource('mapentity-snap-source-road'), 'snap source').to.exist;
        });

        // Start drawing so snapping helper is active
        cy.get('#id_geom_draw_line').click();

        // Verify the helper has the method available
        cy.window({timeout: 10000}).should((win) => {
            const helper = win.gm.actionInstances['helper__snapping'];
            expect(helper, 'snapping helper').to.exist;
            expect(helper.setCustomSnappingCoordinates, 'setCustomSnappingCoordinates method').to.be.a('function');
        });
    });

    it('should create a second road with snapping enabled and save successfully', {retries: 3}, () => {
        cy.visit('/road/add/');
        const entityName = `Snapped Road ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // Draw a line near the existing road area
        cy.get('#id_geom_draw_line').click();
        cy.get('.maplibregl-canvas').click(200, 210);
        cy.get('.maplibregl-canvas').click(300, 210, {force: true});
        cy.get('.maplibregl-canvas').click(400, 210, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal('LineString');
            expect(data.coordinates.length).to.equal(3);
        });

        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/road/') && !url.includes('/add/');
        });
        cy.contains(entityName, {timeout: 10000}).should('exist');
    });

    it('should also have snapping infrastructure on the edit page', {retries: 3}, () => {
        cy.visit(`/road/edit/${roadId}/`);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // Verify snap source and layer are present in edit mode too
        cy.window({timeout: 15000}).should((win) => {
            const map = win.mapentity_map;
            expect(map, 'window.mapentity_map').to.exist;
            expect(map.getSource('mapentity-snap-source-road'), 'snap source').to.exist;
            expect(map.getLayer('mapentity-snap-layer-road'), 'snap layer').to.exist;
        });
    });

    it('should not have snapping on DummyModel add page', () => {
        cy.visit('/dummymodel/add/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.waitForGeoman();

        // DummyModel has no snapping_config, so no snap source should exist
        cy.window({timeout: 10000}).should((win) => {
            const map = win.mapentity_map;
            expect(map, 'window.mapentity_map').to.exist;
            expect(map.getSource('mapentity-snap-source-road'), 'no snap source on DummyModel').to.not.exist;
        });
    });
});
