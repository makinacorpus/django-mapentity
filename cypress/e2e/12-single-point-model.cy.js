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
        cy.get('#id_draw_marker').should('exist');
        // Should NOT have line or polygon buttons
        cy.get('#id_draw_line').should('not.exist');
        cy.get('#id_draw_polygon').should('not.exist');
    });

    it('should create entity with Point geometry', {retries: 2}, () => {
        cy.visit('/singlepointmodel/add/')

        const entityName = `Test Point ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_draw_marker').click()
        cy.get('.maplibregl-canvas').click(400, 300)

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');
        cy.get('#id_geom').invoke('val').should('include', 'Point')

        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    });

    it('should not allow drawing multiple points', () => {
        cy.visit('/singlepointmodel/add/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('#id_draw_marker').should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(100, 100, {force: true});

        // Try to draw a second point
        cy.get('#id_draw_marker').click();
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
