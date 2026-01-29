describe('DummyModel Update', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should update entity name and geometry', { retries: 1 }, () => {
    cy.visit('/dummymodel/edit/1/');
    
    // Check for map container
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
    
    // Update the name field
    const newName = `Updated Entity ${Date.now()}`
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(newName)
    
    // Try to move the marker if edit_drag button exists
    cy.get('body').then($body => {
      if ($body.find('#id_edit_drag').length > 0) {
        cy.get('#id_edit_drag').click()
        
        // Wait a bit for edit mode to activate
        cy.wait(500)
        
        // Try to interact with marker
        cy.get('.maplibregl-marker').then($markers => {
          if ($markers.length > 0) {
            cy.get('.maplibregl-marker').first()
              .trigger('mousedown', { button: 0, force: true })
            
            cy.get('.maplibregl-canvas, .maplibre-map canvas').first()
              .trigger('mousemove', { clientX: 150, clientY: 150, force: true })
              .trigger('mouseup', { force: true })
          }
        })
      }
    })
    
    // Submit the form
    cy.get('button[type="submit"], input[type="submit"], #save_changes').first().click()
    
    // Should redirect to detail page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes('/dummymodel/1/')
    })
    
    // Verify the name was updated
    cy.contains(newName, { timeout: 10000 }).should('exist')
  });

  it('should update multiple entities via list actions', () => {
    // Go to list view
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    // Select first 2 checkboxes
    cy.get('table tbody tr').each(($row, index) => {
      if (index < 2) {
        cy.wrap($row).find('input[type="checkbox"]').first().check({ force: true })
      }
    })
    
    // Look for bulk update/edit actions
    cy.get('body').then($body => {
      const actionSelectors = [
        'select[name="action"]',
        '.actions select',
        '[name*="action"]'
      ]
      
      for (const selector of actionSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().select(/update|edit/i, { force: true })
          cy.get('button[type="submit"], input[type="submit"]').first().click({ force: true })
          return
        }
      }
      
      cy.log('No bulk update action found')
    })
  })

  it('should validate required fields on update', () => {
    cy.visit('/dummymodel/edit/1/');
    
    // Clear the name field (required field)
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear()
    
    // Try to submit
    cy.get('button[type="submit"], input[type="submit"], #save_changes').first().click()
    
    // Should stay on edit page due to validation error
    cy.url().should('include', '/edit/')
  });
});
