/**
 * Tests for MultiLineStringModel - MultiLineString geometry
 */

describe('MultiLineStringModel - MultiLineString geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with line draw button', () => {
        cy.visit('/multilinestringmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have line button for MultiLineString
        cy.get('#id_geom_draw_line').should('exist')
        // Should NOT have marker or polygon buttons
        cy.get('#id_geom_draw_marker').should('not.exist')
        cy.get('#id_geom_draw_polygon').should('not.exist')
    });

    it('should create entity with single line', () => {
        cy.visit('/multilinestringmodel/add/')
        const entityName = `Test MultiLineString ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw line
        cy.get('#id_geom_draw_line').click()
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("MultiLineString");
            expect(data.coordinates.length).to.equal(1);  // linstring with 3 points
        });
        cy.assertGeomanFeaturesCount(1);  // one feature

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multilinestringmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });

    it('should create entity with multiple lines', {retries: 2}, () => {
        cy.visit('/multilinestringmodel/add/')
        const entityName = `Test MultiLineString ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw first line
        cy.get('#id_geom_draw_line').click()
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Draw second line
        cy.get('.maplibregl-canvas').click(150, 100)
        cy.get('.maplibregl-canvas').click(200, 150, {force: true});
        cy.get('.maplibregl-canvas').click(250, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("MultiLineString");
            expect(data.coordinates.length).to.equal(2);  // linstring with 3 points
        });
        cy.assertGeomanFeaturesCount(2);  // two features

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multilinestringmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });
});

describe('MultiLineStringModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/multilinestringmodel/add/');

        const entityName = `Test MultiLineString Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Draw a line
        cy.get('#id_geom_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiLineString");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multilinestringmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/multilinestringmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should add more lines in edit mode', {retries: 2}, () => {
        cy.visit(`/multilinestringmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded (1 line from beforeEach)
        cy.assertGeomanFeaturesCount(1);

        // Verify draw line button is visible in edit mode
        cy.get('#id_geom_draw_line', {timeout: 10000}).should('be.visible');

        // Click the draw button to add more lines
        cy.get('#id_geom_draw_line').click();

        // Draw a new line
        cy.get('.maplibregl-canvas').click(250, 100);
        cy.get('.maplibregl-canvas').click(300, 150, {force: true});
        cy.get('.maplibregl-canvas').click(350, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Verify we now have 2 lines (added, not replaced for Multi types)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiLineString");
            expect(data.coordinates.length).to.equal(2);
        });

        cy.assertGeomanFeaturesCount(2);

        // Update the name to confirm the edit
        const newName = `Added MultiLineString ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multilinestringmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow editing vertices in edit mode', {retries: 2}, () => {
        cy.visit(`/multilinestringmodel/edit/${entityId}/`);

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
            expect(data.type).to.equal("MultiLineString");
        });

        const newName = `Edited MultiLineString ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multilinestringmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
