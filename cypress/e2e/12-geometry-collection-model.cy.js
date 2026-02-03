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
        cy.get('#id_draw_marker').should('exist')
        cy.get('#id_draw_line').should('exist')
        cy.get('#id_draw_polygon').should('exist')
    })

    it('should create entity with mixed geometries', {retries: 2}, () => {
        cy.visit('/geometrycollectionmodel/add/')
        const entityName = `Test GeometryCollection ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw a point
        cy.get('#id_draw_marker').click()
        cy.get('.maplibregl-canvas').click(100, 100, {force: true})

        // Draw a line
        cy.get('#id_draw_line').click()
        cy.get('.maplibregl-canvas').click(150, 150, {force: true})
        cy.get('.maplibregl-canvas').click(200, 200, {force: true})
        cy.get('.maplibregl-canvas').click(250, 250, {force: true})
        cy.get('.maplibregl-marker').last().click({force: true})
        cy.wait(500);

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("GeometryCollection");
            expect(data.geometries.length).to.equal(2);  // linstring with 3 points
        });
        cy.assertGeomanFeaturesCount(2);  // two features

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrycollectionmodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })

})
