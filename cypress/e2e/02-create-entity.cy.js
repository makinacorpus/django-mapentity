describe('DummyModel Create', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/add/')
  })

  it('should display the create form', () => {
    cy.get('form', { timeout: 10000 }).should('exist')
  })

  it('should have map container for geometry input', () => {
    // Check for map container (maplibre-map is added by widget)
    // Using flexible selector since map might be in different containers
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
  })

  it('should show validation error when submitting without geometry', () => {
    // Fill only text fields without drawing geometry
    cy.get('input[name="name_en"]', { timeout: 10000 }).type('Test Entity Without Geom')
    
    cy.setTinyMceContent('short_description', 'Test short description');

    cy.setTinyMceContent('description', 'Test description');
    
    // Try to submit - should fail validation
    cy.get('button[type="submit"], input[type="submit"]').click()
    
    // Should stay on the same page with validation error
    cy.url().should('include', '/dummymodel/add/')
  })

  it('should create entity successfully with all required fields and geometry', { retries: 2 }, () => {
    const entityName = `Test Entity ${Date.now()}`
    
    // Fill in required fields
    cy.get('input[name="name_en"]', { timeout: 10000 }).clear().type(entityName)
    
    cy.setTinyMceContent('short_description', 'Test short description');

    cy.setTinyMceContent('description', 'Test description');
    
    // Wait for map to be ready
    cy.get('.maplibre-map, [id*="map"]', { timeout: 15000 }).should('exist')
    
    // Wait a bit for Geoman to initialize
    cy.wait(2000)
    
    // Try to find and click the marker/point draw button
    // Geoman typically adds buttons with specific data attributes or classes
    cy.get('body').then($body => {
      // Look for common Geoman draw control selectors
      const selectors = [
        '[data-gm-tool="drawMarker"]',
        '.leaflet-pm-icon-marker',
        'button[title*="marker" i]',
        'button[title*="point" i]',
        '.maplibregl-ctrl button:first',
        '.mapboxgl-ctrl-group button:first'
      ]
      
      let buttonFound = false
      for (const selector of selectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({ force: true })
          buttonFound = true
          break
        }
      }
      
      if (!buttonFound) {
        // If no draw button found, try clicking on the map directly
        cy.log('No draw button found, clicking map directly')
        cy.get('.maplibre-map, [id*="map"]').first().click(200, 200, { force: true })
      } else {
        // After clicking draw button, click on the map to place the point
        cy.wait(500)
        cy.get('.maplibre-map, [id*="map"]').first().click(200, 200, { force: true })
      }
    })
    
    // Wait a bit for geometry to be registered
    cy.wait(1000)
    
    // Submit the form
    cy.get('button[type="submit"], input[type="submit"]').click()
    
    // Should redirect to detail or list page
    cy.url({ timeout: 15000 }).should('satisfy', (url) => {
      return url.includes('/dummymodel/') && !url.includes('/add/')
    })
    
    // Verify the entity name appears
    cy.contains(entityName, { timeout: 10000 }).should('exist')
  })
})
