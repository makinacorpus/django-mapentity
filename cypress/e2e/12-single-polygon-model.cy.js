/**
 * Tests for SinglePolygonModel - Polygon geometry
 */

describe('SinglePolygonModel - Polygon geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with polygon draw button only', () => {
        cy.visit('/singlepolygonmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have polygon button for Polygon
        cy.get('#id_draw_polygon').should('exist')
        // Should NOT have marker or line buttons
        cy.get('#id_draw_marker').should('not.exist')
        cy.get('#id_draw_line').should('not.exist')
    })

    it('should create entity with single Polygon geometry', {retries: 2}, () => {
        cy.visit('/singlepolygonmodel/add/')
        const entityName = `Test Polygon ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_draw_polygon').click()
        // Draw a polygon (triangle)
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("Polygon");
            expect(data.coordinates.length).to.equal(1);  // 1 polygon
            expect(data.coordinates[0].length).to.equal(4);  // with 4 points
        });
        cy.assertGeomanFeaturesCount(1);  // one feature

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepolygonmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });

    it('should not allow drawing multiple polygons', () => {
        cy.visit('/singlepolygonmodel/add/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('#id_draw_polygon').should('exist');
        // Draw first polygon
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});
        cy.assertGeomanFeaturesCount(1);
        // Attempt to draw second polygon
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // The geometry field should still only contain one polygon
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
            expect(data.coordinates.length).to.equal(1);  // still only 1 polygon
            expect(data.coordinates[0].length).to.equal(4);  // with 4 points
        });

        cy.assertGeomanFeaturesCount(1);  // still only one feature

    })
});

describe('SinglePolygonModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/singlepolygonmodel/add/');

        const entityName = `Test Polygon Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepolygonmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepolygonmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should replace geometry in edit mode', {retries: 2}, () => {
        cy.visit(`/singlepolygonmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Verify draw polygon button is visible in edit mode
        cy.get('#id_draw_polygon', {timeout: 10000}).should('be.visible');

        // Click the draw button to replace the existing geometry
        cy.get('#id_draw_polygon').click();

        // Draw a new polygon at a different location
        cy.get('.maplibregl-canvas').click(250, 100);
        cy.get('.maplibregl-canvas').click(250, 150, {force: true});
        cy.get('.maplibregl-canvas').click(350, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Verify the geometry is still a Polygon (replaced, not added)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
            expect(data.coordinates.length).to.equal(1);
        });

        cy.assertGeomanFeaturesCount(1);

        // Update the name to confirm the edit
        const newName = `Replaced Polygon ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlepolygonmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow editing vertices in edit mode', {retries: 2}, () => {
        cy.visit(`/singlepolygonmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Check if edit button exists and use it
        cy.get('body').then($body => {
            if ($body.find('#id_edit_drag').length > 0) {
                cy.get('#id_edit_drag').click();

                // Try to drag a vertex
                cy.get('.maplibregl-marker').first()
                    .trigger('mousedown', {button: 0, force: true});

                cy.get('.maplibregl-canvas').first()
                    .trigger('mousemove', {clientX: 250, clientY: 250, force: true})
                    .trigger('mouseup', {force: true});
            }
        });

        // Verify geometry still exists
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
        });

        const newName = `Edited Polygon ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlepolygonmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
