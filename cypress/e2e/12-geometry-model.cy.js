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
        cy.get('#id_draw_marker').should('exist')
        cy.get('#id_draw_line').should('exist')
        cy.get('#id_draw_polygon').should('exist')
    })

    it('should create entity with Point geometry', {retries: 2}, () => {
        cy.visit('/geometrymodel/add/')
        const entityName = `Test Geometry Point ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        cy.get('#id_draw_marker').click()
        cy.get('.maplibregl-canvas').click(400, 300)

        cy.get('#id_geom').invoke('val').should('not.be.empty')

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

        cy.get('#id_draw_line').click();
        // Draw a line with multiple points
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // The geometry field should still only contain one point
        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');

        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
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

        cy.get('#id_draw_polygon').click()
        // Draw a polygon (triangle)
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
            // check number of arrays in data.coordinates
            expect(data.type).to.equal("Polygon");
            expect(data.coordinates.length).to.equal(1);  // 1 polygon
            expect(data.coordinates[0].length).to.equal(4);  // with 4 points
        });
        cy.assertGeomanFeaturesCount(1);  // two features

        cy.get('#save_changes').click()
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrymodel/') && !url.includes('/add/')
        })
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
})
