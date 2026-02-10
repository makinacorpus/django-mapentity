/**
 * Tests for SingleLineStringModel - LineString geometry
 */

describe('SingleLineStringModel - LineString geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with line draw button only', () => {
        cy.visit('/singlelinestringmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have line button for LineString
        cy.get('#id_draw_line').should('exist')
        // Should NOT have marker or polygon buttons
        cy.get('#id_draw_marker').should('not.exist')
        cy.get('#id_draw_polygon').should('not.exist')
    })

    it('should create entity with LineString geometry', {retries: 2}, () => {
        cy.visit('/singlelinestringmodel/add/');
        const entityName = `Test LineString ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_line').click();
        // Draw a line with multiple points
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("LineString");
            expect(data.coordinates.length).to.equal(3);  // linstring with 3 points
        });

        cy.assertGeomanFeaturesCount(1);  // one feature

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlelinestringmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })

    it('should not allow drawing multiple lines', () => {
        cy.visit('/singlelinestringmodel/add/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('#id_draw_line').should('exist');

        cy.get('#id_draw_line').click();
        // Draw first line
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});
        cy.assertGeomanFeaturesCount(1);
        // Try to draw a second line
        cy.get('#id_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("LineString");
            expect(data.coordinates.length).to.equal(3);  // still only one linestring with 3 points
        });

        cy.assertGeomanFeaturesCount(1);  // still only one feature
    });
});

describe('SingleLineStringModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/singlelinestringmodel/add/');

        const entityName = `Test LineString Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("LineString");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlelinestringmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlelinestringmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should replace geometry in edit mode', {retries: 2}, () => {
        cy.visit(`/singlelinestringmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Verify draw line button is visible in edit mode
        cy.get('#id_draw_line', {timeout: 10000}).should('be.visible');

        // Click the draw button to replace the existing geometry
        cy.get('#id_draw_line').click();

        // Draw a new line at a different location
        cy.get('.maplibregl-canvas').click(250, 100);
        cy.get('.maplibregl-canvas').click(300, 150, {force: true});
        cy.get('.maplibregl-canvas').click(350, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Verify the geometry is still a LineString (replaced, not added)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("LineString");
            expect(data.coordinates.length).to.equal(3);
        });

        cy.assertGeomanFeaturesCount(1);

        // Update the name to confirm the edit
        const newName = `Replaced LineString ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlelinestringmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow editing vertices in edit mode', {retries: 2}, () => {
        cy.visit(`/singlelinestringmodel/edit/${entityId}/`);

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
            expect(data.type).to.equal("LineString");
        });

        const newName = `Edited LineString ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/singlelinestringmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
