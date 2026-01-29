describe('DummyModel Update', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/dummymodel/edit/1/');
  });

  it('should have map container for geometry input', () => {
    // Check for map container (maplibre-map is added by widget)
    // Using flexible selector since map might be in different containers
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
  });

  it('should not have draw marker button', () => {
    cy.get('#id_draw_marker', { timeout: 10000 }).should('not.exist');
  });

  it('should move marker and validate update', () => {
    // Fill only text fields without drawing geometry
    cy.get('#id_edit_drag').click();
    
    cy.get('.maplibregl-marker')
      .should('have.length', 1)
      .as('marker')

    cy.get('@marker')
      .trigger('mousedown', { button: 0, force: true })

    cy.get('.maplibregl-canvas')
      .trigger('mousemove', {
        clientX: 50,
        clientY: 50,
        force: true
      })

    cy.get('.maplibregl-canvas')
      .trigger('mouseup', { force: true })

    // Submit the form
    cy.get('#save_changes').click()
    
    // Should redirect to detail or list page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes('/dummymodel/1/')
    })
  });
});
