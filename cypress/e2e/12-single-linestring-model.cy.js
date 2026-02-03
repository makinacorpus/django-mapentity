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
