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
        cy.get('#id_draw_line').should('exist')
        // Should NOT have marker or polygon buttons
        cy.get('#id_draw_marker').should('not.exist')
        cy.get('#id_draw_polygon').should('not.exist')
    });

    it('should create entity with single line', () => {
        cy.visit('/multilinestringmodel/add/')
        const entityName = `Test MultiLineString ${Date.now()}`

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName)
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Draw line
        cy.get('#id_draw_line').click()
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
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
        cy.get('#id_draw_line').click()
        cy.get('.maplibregl-canvas').click(100, 100)
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Draw second line
        cy.get('.maplibregl-canvas').click(150, 100)
        cy.get('.maplibregl-canvas').click(200, 150, {force: true});
        cy.get('.maplibregl-canvas').click(250, 200, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
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
})
