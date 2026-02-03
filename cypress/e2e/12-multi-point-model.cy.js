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

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');

        // cehck there is one feature in the MultiPoint
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
            // check number of arrays in data.coordinates
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

        cy.get('#id_geom', {timeout: 10000}).invoke('val').should('not.be.empty');

        // cehck there is one feature in the MultiPoint WKT
        cy.get('#id_geom').invoke('val').then((val) => {
            const data = JSON.parse(val);
            // check number of arrays in data.coordinates
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
})
