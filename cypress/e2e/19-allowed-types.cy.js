/**
 * Tests for AllowedTypesModel - Geometry field with allowed_types option
 */

describe('AllowedTypesModel - Geometry field with allowed_types option', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should display create form with restricted draw buttons (Point and Line only)', () => {
        cy.visit('/allowedtypesmodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Should have Point and Line draw buttons
        cy.get('#id_geom_draw_marker').should('exist');
        cy.get('#id_geom_draw_line').should('exist');

        // Should NOT have Polygon draw button
        cy.get('#id_geom_draw_polygon').should('not.exist');
    });

    it('should only keep one geometry on the map (drawing a Line replaces the Point)', {retries: 2}, () => {
        cy.visit('/allowedtypesmodel/add/');
        const entityName = `Test AllowedTypes Single Geom ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // 1. Draw a Point marker
        cy.get('#id_geom_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);

        cy.assertGeomanFeaturesCount(1);
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        // 2. Draw a LineString
        cy.get('#id_geom_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        // Click on the last vertex to finish drawing the line
        cy.get('.maplibregl-marker').last().click({force: true});

        // 3. Verify the previous Point is deleted and we only have the LineString (feature count is 1)
        cy.assertGeomanFeaturesCount(1);
        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("LineString");
            expect(data.coordinates.length).to.equal(3);
        });

        // 4. Save and verify entity is created successfully
        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/allowedtypesmodel/') && !url.includes('/add/');
        });
        cy.contains(entityName, {timeout: 10000}).should('exist');
    });
});
