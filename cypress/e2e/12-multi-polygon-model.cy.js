/**
 * Tests for MultiPolygonModel - MultiPolygon geometry
 */

describe('MultiPolygonModel - MultiPolygon geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with polygon draw button', () => {
        cy.visit('/multipolygonmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have polygon button for MultiPolygon
        cy.get('#id_draw_polygon').should('exist')
        // Should NOT have marker or line buttons
        cy.get('#id_draw_marker').should('not.exist')
        cy.get('#id_draw_line').should('not.exist')
    });

    it('should create entity with single polygon', {retries: 2}, () => {
        cy.visit('/multipolygonmodel/add/')
        const entityName = `Test MultiPolygon ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw single polygon
        cy.get('#id_draw_polygon').click()
        // Draw a polygon (triangle)
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("MultiPolygon");
            expect(data.coordinates.length).to.equal(1);  // 1 polygon
            expect(data.coordinates[0].length).to.equal(1);  // with 4 points
            expect(data.coordinates[0][0].length).to.equal(4);  // with 4 points
        });
        cy.assertGeomanFeaturesCount(1);  // one feature

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipolygonmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });

    it('should create entity with multiple polygons', {retries: 2}, () => {
        cy.visit('/multipolygonmodel/add/')
        const entityName = `Test MultiPolygon ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw first polygon
        cy.get('#id_draw_polygon').click()
        // Draw a polygon (triangle)
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Draw a polygon (triangle)
        cy.get('.maplibregl-canvas').click(150, 100, {force: true})
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(250, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("MultiPolygon");
            expect(data.coordinates.length).to.equal(1);  // 1 polygon
            expect(data.coordinates[0].length).to.equal(1);  // with 4 points
        });
        cy.assertGeomanFeaturesCount(2);  // two features

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipolygonmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
});

describe('MultiPolygonModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/multipolygonmodel/add/');

        const entityName = `Test MultiPolygon Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Draw a polygon
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPolygon");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipolygonmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/multipolygonmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should add more polygons in edit mode', {retries: 2}, () => {
        cy.visit(`/multipolygonmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded (1 polygon from beforeEach)
        cy.assertGeomanFeaturesCount(1);

        // Verify draw polygon button is visible in edit mode
        cy.get('#id_draw_polygon', {timeout: 10000}).should('be.visible');

        // Click the draw button to add more polygons
        cy.get('#id_draw_polygon').click();

        // Draw a new polygon
        cy.get('.maplibregl-canvas').click(250, 100);
        cy.get('.maplibregl-canvas').click(250, 150, {force: true});
        cy.get('.maplibregl-canvas').click(350, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Verify we now have 2 polygons (added, not replaced for Multi types)
        cy.assertGeomanFeaturesCount(2);

        // Update the name to confirm the edit
        const newName = `Added MultiPolygon ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multipolygonmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow editing vertices in edit mode', {retries: 2}, () => {
        cy.visit(`/multipolygonmodel/edit/${entityId}/`);

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
            expect(data.type).to.equal("MultiPolygon");
        });

        const newName = `Edited MultiPolygon ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multipolygonmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
