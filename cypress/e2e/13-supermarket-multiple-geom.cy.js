/**
 * Tests for Supermarket - Multiple geometry fields (Polygon + Point)
 * New behavior: Separate control panels for each field on shared map
 */

describe('Supermarket - Multiple geometry fields with separate control panels', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should display separate control panels for each geometry field', () => {
        cy.visit('/supermarket/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should have separate control panels for each field
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]', {timeout: 5000}).should('exist');
        cy.get('.mapentity-field-controls[data-field-id="id_parking"]', {timeout: 5000}).should('exist');
        
        // Geom panel should have polygon button
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]').within(() => {
            cy.contains('Polygon').should('exist');
        });
        
        // Parking panel should have point button
        cy.get('.mapentity-field-controls[data-field-id="id_parking"]').within(() => {
            cy.contains('Point').should('exist');
        });
    });

    it('should create entity with both polygon and point geometries using separate controls', {retries: 2}, () => {
        cy.visit('/supermarket/add/')
        
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Wait for both control panels to be visible
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]', {timeout: 5000}).should('be.visible');
        cy.get('.mapentity-field-controls[data-field-id="id_parking"]', {timeout: 5000}).should('be.visible');
        
        // Use Geom panel to draw polygon
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]').within(() => {
            cy.contains('Polygon').click();
        });
        cy.wait(500);
        
        // Draw polygon
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.get('.maplibregl-canvas').click(400, 300);
        cy.get('.maplibregl-canvas').click(400, 400);
        cy.get('.maplibregl-canvas').click(300, 400);
        cy.get('.maplibregl-canvas').click(300, 300); // Close polygon
        cy.wait(500);
        
        // Use Parking panel to draw point
        cy.get('.mapentity-field-controls[data-field-id="id_parking"]').within(() => {
            cy.contains('Point').click();
        });
        cy.wait(500);
        
        // Draw point
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

    it('should route events to correct field based on which control was clicked', {retries: 2}, () => {
        cy.visit('/supermarket/add/')
        
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]', {timeout: 5000}).should('be.visible');
        
        // Draw polygon using geom controls
        cy.get('.mapentity-field-controls[data-field-id="id_geom"]').within(() => {
            cy.contains('Polygon').click();
        });
        cy.wait(500);
        
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.get('.maplibregl-canvas').click(400, 300);
        cy.get('.maplibregl-canvas').click(400, 400);
        cy.get('.maplibregl-canvas').click(300, 400);
        cy.get('.maplibregl-canvas').click(300, 300);
        cy.wait(500);
        
        // Verify polygon saved to geom field
        cy.get('textarea[name="geom"]').invoke('val').then((geomVal) => {
            expect(geomVal).to.not.be.empty;
        });
        
        // Draw point using parking controls
        cy.get('.mapentity-field-controls[data-field-id="id_parking"]').within(() => {
            cy.contains('Point').click();
        });
        cy.wait(500);
        
        cy.get('.maplibregl-canvas').click(350, 350);
        cy.wait(500);
        
        // Verify point saved to parking field
        cy.get('textarea[name="parking"]').invoke('val').then((parkingVal) => {
            expect(parkingVal).to.not.be.empty;
        });
        
        // Verify geom field still has polygon (not overwritten)
        cy.get('textarea[name="geom"]').invoke('val').then((geomVal) => {
            expect(geomVal).to.not.be.empty;
            const geomData = JSON.parse(geomVal);
            expect(geomData.type).to.equal("Polygon");
        });
    });
});

describe('Single field models should not have control panels', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    })

    it('should not display control panels for single geometry field models', () => {
        cy.visit('/dummymodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should NOT have custom control panels for single field
        cy.get('.mapentity-field-controls').should('not.exist');
        
        // Should have default Geoman controls
        cy.get('#id_draw_marker').should('exist');
    });

    it('single point model should not have control panels', () => {
        cy.visit('/singlepointmodel/add/');
        cy.get('form', {timeout: 10000}).should('exist');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        
        // Should NOT have custom control panels
        cy.get('.mapentity-field-controls').should('not.exist');
        
        // Should have default Geoman controls for Point
        cy.get('#id_draw_marker').should('exist');
    });
});
