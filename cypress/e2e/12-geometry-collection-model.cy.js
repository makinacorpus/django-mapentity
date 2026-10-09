/**
 * Tests for GeometryCollectionModel - GeometryCollection
 */

describe('GeometryCollectionModel - GeometryCollection', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with all draw buttons', () => {
        cy.visit('/geometrycollectionmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have all draw buttons for GeometryCollection
        cy.get('#id_geom_draw_marker').should('exist')
        cy.get('#id_geom_draw_line').should('exist')
        cy.get('#id_geom_draw_polygon').should('exist')
    })

    it('should create entity with mixed geometries', {retries: 2}, () => {
        cy.visit('/geometrycollectionmodel/add/')
        const entityName = `Test GeometryCollection ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw a point
        cy.get('#id_geom_draw_marker').click()
        cy.get('.maplibregl-canvas').click(100, 100, {force: true})

        // Draw a line
        cy.get('#id_geom_draw_line').click()
        cy.get('.maplibregl-canvas').click(150, 150, {force: true})
        cy.get('.maplibregl-canvas').click(200, 200, {force: true})
        cy.get('.maplibregl-canvas').click(250, 250, {force: true})
        cy.get('.maplibregl-marker').last().click({force: true})
        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("GeometryCollection");
            expect(data.geometries.length).to.equal(2);  // point + linestring
        });
        cy.assertGeomanFeaturesCount(2);  // two features

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrycollectionmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
});

describe('GeometryCollectionModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/geometrycollectionmodel/add/');

        const entityName = `Test GeometryCollection Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Draw a point
        cy.get('#id_geom_draw_marker').click();
        cy.get('.maplibregl-canvas').click(100, 100, {force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("GeometryCollection");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrycollectionmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/geometrycollectionmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should add more geometries in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrycollectionmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded (1 point from beforeEach)
        cy.assertGeomanFeaturesCount(1);

        // Verify all draw buttons are visible in edit mode
        cy.get('#id_geom_draw_marker', {timeout: 10000}).should('be.visible');
        cy.get('#id_geom_draw_line').should('be.visible');
        cy.get('#id_geom_draw_polygon').should('be.visible');

        // Click the draw line button to add a line to the collection
        cy.get('#id_geom_draw_line').click();

        // Draw a new line
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-canvas').click(250, 250, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Verify we now have 2 geometries (added, not replaced for GeometryCollection)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("GeometryCollection");
            expect(data.geometries.length).to.equal(2);
        });

        cy.assertGeomanFeaturesCount(2);

        // Update the name to confirm the edit
        const newName = `Added to GeometryCollection ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrycollectionmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should add polygon to existing collection in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrycollectionmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Click the draw polygon button to add a polygon to the collection
        cy.get('#id_geom_draw_polygon').click();

        // Draw a new polygon
        cy.get('.maplibregl-canvas').click(200, 100);
        cy.get('.maplibregl-canvas').click(200, 150, {force: true});
        cy.get('.maplibregl-canvas').click(300, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Verify we now have 2 geometries
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("GeometryCollection");
            expect(data.geometries.length).to.equal(2);
        });

        cy.assertGeomanFeaturesCount(2);

        // Update the name to confirm the edit
        const newName = `Added Polygon to Collection ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrycollectionmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow dragging geometries in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrycollectionmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Check if drag button exists and use it
        cy.get('body').then($body => {
            if ($body.find('#id_edit_drag').length > 0) {
                cy.get('#id_edit_drag').click();

                // Try to drag the marker
                cy.get('.maplibregl-marker').first()
                    .trigger('mousedown', {button: 0, force: true});

                cy.get('.maplibregl-canvas').first()
                    .trigger('mousemove', {clientX: 250, clientY: 250, force: true})
                    .trigger('mouseup', {force: true});
            }
        });

        // Verify geometry still exists
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("GeometryCollection");
        });

        const newName = `Dragged GeometryCollection ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrycollectionmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
