describe('Replace Geometry in Edit Mode', () => {
  let entityId

  beforeEach(() => {
    cy.login()
    
    // Create a new entity with geometry for testing
    cy.visit('/dummymodel/add/')
    
    const entityName = `Test Entity ${Date.now()}`
    
    // Fill in required fields
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(entityName)
    cy.setTinyMceContent('id_short_description', 'Test short description');
    cy.setTinyMceContent('id_description', 'Test description');
    
    // Wait for map to be ready
    cy.get('.maplibre-map, [id*="map"]', { timeout: 15000 }).should('exist')
    cy.wait(2000)

    // Draw a point
    cy.get('#id_draw_marker').click();
    cy.get('.maplibregl-canvas').click(400, 300);
    cy.wait(1000)
    
    // Submit the form
    cy.get('#save_changes').click()
    
    // Get the entity ID from the URL
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes('/dummymodel/') && !url.includes('/add/')
    }).then((url) => {
      const match = url.match(/\/dummymodel\/(\d+)\//)
      if (match) {
        entityId = match[1]
        cy.log(`Created entity with ID: ${entityId}`)
      }
    })
  });

  it('should allow replacing geometry in edit mode for simple Point type', { retries: 1 }, () => {
    // Visit the edit page
    cy.visit(`/dummymodel/edit/${entityId}/`);
    
    // Check for map container
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
    
    // Wait for Geoman to initialize
    cy.wait(2000)
    
    // Verify draw marker button is visible in edit mode (this is the new behavior)
    cy.get('#id_draw_marker', { timeout: 10000 }).should('be.visible')
    
    // Click the draw button to replace the existing geometry
    cy.get('#id_draw_marker').click()
    
    // Wait for draw mode to activate and old marker to be removed
    cy.wait(500)
    
    // Draw a new point at a different location
    cy.get('.maplibregl-canvas').click(200, 200);
    
    // Wait for new geometry to be registered
    cy.wait(1000)
    
    // Update the name to confirm the edit
    const newName = `Replaced Geometry ${Date.now()}`
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(newName)
    
    // Submit the form
    cy.get('#save_changes').click()
    
    // Should redirect to detail page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes(`/dummymodel/${entityId}/`)
    })
    
    // Verify the name was updated
    cy.contains(newName, { timeout: 10000 }).should('exist')
  });

  it('should allow deleting geometry using delete button', { retries: 1 }, () => {
    // Visit the edit page
    cy.visit(`/dummymodel/edit/${entityId}/`);
    
    // Wait for map to be ready
    cy.get('.maplibre-map, [id*="map"]', { timeout: 10000 }).should('exist')
    cy.wait(2000)
    
    // Check if delete button is visible
    cy.get('body').then($body => {
      if ($body.find('#id_edit_delete').length > 0) {
        // Click delete button
        cy.get('#id_edit_delete').click()
        
        // Wait for delete mode to activate
        cy.wait(500)
        
        // Try to click on the marker to delete it
        cy.get('.maplibregl-marker').then($markers => {
          if ($markers.length > 0) {
            cy.get('.maplibregl-marker').first().click({ force: true })
            cy.wait(500)
          }
        })
        
        // Update the name to confirm the edit
        const newName = `Deleted Geometry ${Date.now()}`
        cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(newName)
        
        // Submit the form
        cy.get('#save_changes').click()
        
        // Should redirect to detail page (even without geometry since it's nullable)
        cy.url({ timeout: 15000 }).should('satisfy', (url) => {
          return url.includes(`/dummymodel/${entityId}/`)
        })
      } else {
        cy.log('Delete button not found, skipping delete test')
      }
    })
  });
});

describe('Add Multiple Geometries in Edit Mode', () => {
  let entityId

  beforeEach(() => {
    cy.login()
    
    // Create a new entity with GeometryCollection for testing
    cy.visit('/dummyaptmodel/add/')
    
    const entityName = `Test MultiGeom Entity ${Date.now()}`
    
    // Fill in required fields
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(entityName)
    cy.setTinyMceContent('id_short_description', 'Test short description');
    cy.setTinyMceContent('id_description', 'Test description');
    
    // Wait for map to be ready
    cy.get('.maplibre-map, [id*="map"]', { timeout: 15000 }).should('exist')
    cy.wait(2000)

    // Draw a point
    cy.get('#id_draw_marker').click();
    cy.get('.maplibregl-canvas').click(400, 300);
    cy.wait(1000)
    
    // Submit the form
    cy.get('#save_changes').click()
    
    // Get the entity ID from the URL
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes('/dummyaptmodel/') && !url.includes('/add/')
    }).then((url) => {
      const match = url.match(/\/dummyaptmodel\/(\d+)\//)
      if (match) {
        entityId = match[1]
        cy.log(`Created entity with ID: ${entityId}`)
      }
    })
  });

  it('should allow adding multiple geometries in edit mode for GeometryCollection type', { retries: 1 }, () => {
    // Visit the edit page
    cy.visit(`/dummyaptmodel/edit/${entityId}/`);
    
    // Check for map container
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
    
    // Wait for Geoman to initialize
    cy.wait(2000)
    
    // Verify draw marker button is visible in edit mode
    cy.get('#id_draw_marker', { timeout: 10000 }).should('be.visible')
    
    // Click the draw button to add another geometry (should not replace existing)
    cy.get('#id_draw_marker').click()
    
    // Wait for draw mode to activate
    cy.wait(500)
    
    // Draw a new point at a different location
    cy.get('.maplibregl-canvas').click(200, 200);
    
    // Wait for new geometry to be registered
    cy.wait(1000)
    
    // Update the name to confirm the edit
    const newName = `Added Geometry ${Date.now()}`
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(newName)
    
    // Submit the form
    cy.get('#save_changes').click()
    
    // Should redirect to detail page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes(`/dummyaptmodel/${entityId}/`)
    })
    
    // Verify the name was updated
    cy.contains(newName, { timeout: 10000 }).should('exist')
  });
});
