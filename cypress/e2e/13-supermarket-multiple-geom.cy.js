/**
 * Tests for Supermarket - Multiple geometry fields (Polygon + Point)
 * New behavior: All controls visible simultaneously, no field selector
 */

describe('Supermarket - Multiple geometry fields', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display all controls simultaneously without field selector', () => {
        cy.visit('/supermarket/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should NOT have field selector control
        cy.get('.mapentity-field-selector').should('not.exist');
        
        // Both polygon AND marker controls should be visible simultaneously
        cy.get('#id_draw_polygon', {timeout: 5000}).should('exist');
        cy.get('#id_draw_marker', {timeout: 5000}).should('exist');
    });

    it('should create entity with both polygon and point geometries simultaneously', {retries: 2}, () => {
        cy.visit('/supermarket/add/')
        
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Both controls should be visible
        cy.get('#id_draw_polygon', {timeout: 5000}).should('exist');
        cy.get('#id_draw_marker', {timeout: 5000}).should('exist');
        
        // Draw polygon for geom field (no need to switch fields)
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.get('.maplibregl-canvas').click(400, 300);
        cy.get('.maplibregl-canvas').click(400, 400);
        cy.get('.maplibregl-canvas').click(300, 400);
        cy.get('.maplibregl-canvas').click(300, 300); // Close polygon
        cy.wait(500);
        
        // Draw point for parking field (no need to switch fields)
        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(350, 350);
        cy.wait(500);
        
        // Verify both geometries are saved
        cy.get('textarea[name="geom"]').invoke('val').then((geomVal) => {
            expect(geomVal).to.not.be.empty;
            const geomData = JSON.parse(geomVal);
            expect(geomData.type).to.equal("Polygon");
        });
        
        cy.get('textarea[name="parking"]').invoke('val').then((parkingVal) => {
            expect(parkingVal).to.not.be.empty;
            const parkingData = JSON.parse(parkingVal);
            expect(parkingData.type).to.equal("Point");
        });
        
        cy.get('#save_changes').click();
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/supermarket/') && !url.includes('/add/')
        });
    });

    it('should independently edit each geometry field', {retries: 2}, () => {
        cy.visit('/supermarket/add/')
        
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Both controls should be visible
        cy.get('#id_draw_polygon', {timeout: 5000}).should('exist');
        cy.get('#id_draw_marker', {timeout: 5000}).should('exist');
        
        // Draw polygon for geom field
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.get('.maplibregl-canvas').click(400, 300);
        cy.get('.maplibregl-canvas').click(400, 400);
        cy.get('.maplibregl-canvas').click(300, 400);
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.wait(500);
        
        // Verify polygon is saved
        cy.get('textarea[name="geom"]').invoke('val').then((geomVal) => {
            expect(geomVal).to.not.be.empty;
        });
        
        // Draw point for parking field
        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(350, 350);
        cy.wait(500);
        
        // Draw a new polygon (should replace the old one for Polygon type)
        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(200, 200);
        cy.get('.maplibregl-canvas').click(250, 200);
        cy.get('.maplibregl-canvas').click(250, 250);
        cy.get('.maplibregl-canvas').click(200, 250);
        cy.get('.maplibregl-canvas').click(200, 200);
        cy.wait(500);
        
        // Verify parking geometry is still intact
        cy.get('textarea[name="parking"]').invoke('val').then((parkingVal) => {
            expect(parkingVal).to.not.be.empty;
            const parkingData = JSON.parse(parkingVal);
            expect(parkingData.type).to.equal("Point");
        });
        
        // Verify geom was replaced
        cy.get('textarea[name="geom"]').invoke('val').then((geomVal) => {
            expect(geomVal).to.not.be.empty;
            const geomData = JSON.parse(geomVal);
            expect(geomData.type).to.equal("Polygon");
        });
    });
});

describe('Single field models should not have multi-field behavior', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should not display field selector for single geometry field models', () => {
        cy.visit('/dummymodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should NOT have field selector control for single geometry field
        cy.get('.mapentity-field-selector').should('not.exist');
        
        // Should have normal Geoman controls
        cy.get('#id_draw_marker').should('exist');
    });

    it('single point model should not have field selector', () => {
        cy.visit('/singlepointmodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should NOT have field selector control
        cy.get('.mapentity-field-selector').should('not.exist');
        
        // Should have normal Geoman controls for Point
        cy.get('#id_draw_marker').should('exist');
    });
});
