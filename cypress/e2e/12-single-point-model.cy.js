/**
 * Tests for SinglePointModel - Point geometry
 */

describe('SinglePointModel - Point geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with marker draw button only', () => {
        cy.visit('/singlepointmodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        // Should have marker button for Point
        cy.get('#id_geom_draw_marker').should('exist');
        // Should NOT have line or polygon buttons
        cy.get('#id_geom_draw_line').should('not.exist');
        cy.get('#id_geom_draw_polygon').should('not.exist');
    });

    it('should create entity with Point geometry', {retries: 2}, () => {
        cy.visit('/singlepointmodel/add/')

        const entityName = `Test Point ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_geom_draw_marker').click()
        cy.get('.maplibregl-canvas').click(400, 300)

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });

    it('should not allow drawing multiple points', () => {
        cy.visit('/singlepointmodel/add/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('#id_geom_draw_marker').should('exist');

        cy.get('#id_geom_draw_marker').click();
        cy.get('.maplibregl-canvas').click(100, 100, {force: true});
        cy.assertGeomanFeaturesCount(1);
        cy.assertGeomFieldValue((data, val) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("Point");
            expect(data.coordinates.length).to.equal(2);
            // Alternatively, check WKT string for single Point occurrence
            const pointCount = (val.match(/Point/g) || []).length;
            expect(pointCount).to.equal(1);
        });

        // Try to draw a second point
        cy.get('#id_geom_draw_marker').click();
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.assertGeomFieldValue((data, val) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("Point");
            expect(data.coordinates.length).to.equal(2);
            // Alternatively, check WKT string for single Point occurrence
            const pointCount = (val.match(/Point/g) || []).length;
            expect(pointCount).to.equal(1);
        });

        cy.assertGeomanFeaturesCount(1);

    });
});

describe('SinglePointModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/singlepointmodel/add/');

        const entityName = `Test Point Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_geom_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepointmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should replace geometry in edit mode', {retries: 2}, () => {
        cy.visit(`/singlepointmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Verify draw marker button is visible in edit mode
        cy.get('#id_geom_draw_marker', {timeout: 10000}).should('be.visible');

        // Click the draw button to replace the existing geometry
        cy.get('#id_geom_draw_marker').click();

        // Draw a new point at a different location
        cy.get('.maplibregl-canvas').click(200, 200);

        // Verify the geometry is still a Point (replaced, not added)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.assertGeomanFeaturesCount(1);

        // Update the name to confirm the edit
        const newName = `Replaced Point ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlepointmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow dragging geometry in edit mode', {retries: 2}, () => {
        cy.visit(`/singlepointmodel/edit/${entityId}/`);

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
            expect(data.type).to.equal("Point");
        });

        const newName = `Dragged Point ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlepointmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
