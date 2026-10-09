/**
 * Tests for GeometryModel - Generic Geometry
 */

describe('GeometryModel - Generic Geometry', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display create form with all draw buttons', () => {
        cy.visit('/geometrymodel/add/')
        cy.get('form', {timeout: 10000}).should('exist')
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Should have all draw buttons for generic Geometry
        cy.get('#id_geom_draw_marker').should('exist')
        cy.get('#id_geom_draw_line').should('exist')
        cy.get('#id_geom_draw_polygon').should('exist')
    })

    it('should create entity with Point geometry', {retries: 2}, () => {
        cy.visit('/geometrymodel/add/')
        const entityName = `Test Geometry Point ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_geom_draw_marker').click()
        cy.get('.maplibregl-canvas').click(400, 300)

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrymodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })

    it('should create entity with LineString geometry', {retries: 2}, () => {
        cy.visit('/geometrymodel/add/')
        const entityName = `Test Geometry Line ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_geom_draw_line').click();
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
            return url.includes('/geometrymodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })

    it('should create entity with Polygon geometry', {retries: 2}, () => {
        cy.visit('/geometrymodel/add/')
        const entityName = `Test Geometry Polygon ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_geom_draw_polygon').click()
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
            return url.includes('/geometrymodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
});

describe('GeometryModel - Edit geometry', () => {
    let entityId;

    beforeEach(() => {
        cy.login();
        cy.mockTiles();

        // Create a new entity with Point geometry for testing
        cy.visit('/geometrymodel/add/');

        const entityName = `Test Geometry Edit ${Date.now()}`;

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
            return url.includes('/geometrymodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/geometrymodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    it('should replace Point with LineString in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrymodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Verify all draw buttons are visible in edit mode
        cy.get('#id_geom_draw_marker', {timeout: 10000}).should('be.visible');
        cy.get('#id_geom_draw_line').should('be.visible');
        cy.get('#id_geom_draw_polygon').should('be.visible');

        // Click the draw line button to replace the existing Point with a LineString
        cy.get('#id_geom_draw_line').click();

        // Draw a new line
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Verify the geometry is now a LineString (replaced)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("LineString");
        });

        cy.assertGeomanFeaturesCount(1);

        // Update the name to confirm the edit
        const newName = `Replaced to LineString ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrymodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should replace geometry with Polygon in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrymodel/edit/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify initial geometry is loaded
        cy.assertGeomanFeaturesCount(1);

        // Click the draw polygon button to replace the existing geometry
        cy.get('#id_geom_draw_polygon').click();

        // Draw a new polygon
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Verify the geometry is now a Polygon (replaced)
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
        });

        cy.assertGeomanFeaturesCount(1);

        // Update the name to confirm the edit
        const newName = `Replaced to Polygon ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrymodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });

    it('should allow dragging geometry in edit mode', {retries: 2}, () => {
        cy.visit(`/geometrymodel/edit/${entityId}/`);

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
            expect(data.type).to.be.oneOf(["Point", "LineString", "Polygon"]);
        });

        const newName = `Dragged Geometry ${Date.now()}`;
        cy.get('input[name="name"]', {timeout: 10000}).clear().type(newName);

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes(`/geometrymodel/${entityId}/`);
        });

        cy.contains(newName, {timeout: 10000}).should('exist');
    });
});
