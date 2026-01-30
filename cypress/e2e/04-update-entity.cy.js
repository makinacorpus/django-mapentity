describe('DummyModel Update', () => {
  let entityId

  beforeEach(() => {
    cy.login()
    
    // Get an entity ID from the list to ensure we're accessing an existing entity
    cy.visit('/dummymodel/list/')
    cy.get('table tbody tr', { timeout: 10000 }).first().find('a').first().invoke('attr', 'href').then((href) => {
      const match = href.match(/\/dummymodel\/(\d+)\//)
      if (match) {
        entityId = match[1]
        cy.log(`Using entity ID: ${entityId}`)
      }
    })
  });

  it('should update entity name and geometry', { retries: 1 }, () => {
    cy.visit(`/dummymodel/edit/${entityId}/`);
    
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
    cy.get('#save_changes').click()
    
    // Should redirect to detail page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes(`/dummymodel/${entityId}/`)
    })
    
    // Verify the name was updated
    cy.contains(newName, { timeout: 10000 }).should('exist')
  });

  it('should update multiple entities via list actions', () => {
    // Go to list view
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    cy.get(".dt-select-checkbox").first().click();
    cy.get("#btn-batch-editing").first().click();
    cy.get("#btn-edit").first().click();
    
    cy.get("select[name=public]").select('true', { force: true })

    cy.get('#submit-id-save').click({ force: true })

  })

});
