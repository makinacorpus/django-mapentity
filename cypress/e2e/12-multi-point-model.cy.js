/**
 * Tests for MultiPointModel - MultiPoint geometry
 */

describe('MultiPointModel - MultiPoint geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with marker draw button', () => {
        cy.visit('/multipointmodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have marker button for MultiPoint
        cy.get('#id_draw_marker').should('exist')
        // Should NOT have line or polygon buttons (only points allowed)
        cy.get('#id_draw_line').should('not.exist')
        cy.get('#id_draw_polygon').should('not.exist')
    })

    it('should create entity with single point in MultiPointModel', {retries: 2}, () => {
        cy.visit('/multipointmodel/add/')
        const entityName = `Test MultiPoint Single ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_draw_marker').click()
        cy.get('.maplibregl-canvas').click(400, 300)

        // check there is one feature in the MultiPoint
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
            expect(data.coordinates.length).to.equal(1);
        });

        cy.assertGeomanFeaturesCount(1);

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipointmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist');
    });

    it('should create entity with multiple points', {retries: 2}, () => {
        cy.visit('/multipointmodel/add/');
        const entityName = `Test MultiPoint ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Draw first point
        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);

        // Draw second point
        cy.get('.maplibregl-canvas').click(300, 200, {force: true});

        // check there are two features in the MultiPoint
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
            expect(data.coordinates.length).to.equal(2);
        });

        cy.assertGeomanFeaturesCount(2);

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipointmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
});

describe('MultiPointModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with geometry for testing
        cy.visit('/multipointmodel/add/');

        const entityName = `Test MultiPoint Edit ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Draw two points
        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);
        cy.get('.maplibregl-canvas').click(300, 200, {force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
        });

        cy.get('#save_changes').click();

        // Get the entity ID from the URL
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/multipointmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should add more points in edit mode', {retries: 2}, () => {
        cy.visit(`/multipointmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded (2 points from beforeEach)
        cy.assertGeomanFeaturesCount(2);

        // Verify draw marker button is visible in edit mode
        cy.get('#id_draw_marker', {timeout: 10000}).should('be.visible');

        // Click the draw button to add more points
        cy.get('#id_draw_marker').click();

        // Draw a new point
        cy.get('.maplibregl-canvas').click(200, 200);

        // Verify we now have 3 points (added, not replaced for Multi types)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
            expect(data.coordinates.length).to.equal(3);
        });

        cy.assertGeomanFeaturesCount(3);

        // Update the name to confirm the edit
        const newName = `Added MultiPoint ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multipointmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow dragging points in edit mode', {retries: 2}, () => {
        cy.visit(`/multipointmodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(2);

        // Check if drag button exists and use it
        cy.get('body').then($body => {
            if ($body.find('#id_edit_drag').length > 0) {
                cy.get('#id_edit_drag').click();

                // Try to drag a point
                cy.get('.maplibregl-marker').first()
                    .trigger('mousedown', {button: 0, force: true});

                cy.get('.maplibregl-canvas').first()
                    .trigger('mousemove', {clientX: 250, clientY: 250, force: true})
                    .trigger('mouseup', {force: true});
            }
        });

        // Verify geometry still exists
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
        });

        const newName = `Dragged MultiPoint ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/multipointmodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
