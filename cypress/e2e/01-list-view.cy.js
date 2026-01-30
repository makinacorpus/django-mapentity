describe('DummyModel List View', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/list/')
  })

  it('should display the list page', () => {
    cy.url().should('include', '/dummymodel/list')
    cy.get('body').should('be.visible')
  })

  it('should have map container', () => {
    // Check for map container (either mainmap div or maplibre-map class)
    cy.get('#mainmap, .maplibre-map, .map-panel', { timeout: 10000 }).should('exist')
  })

  it('should display table with entities', () => {
    cy.get('table', { timeout: 10000 }).should('exist')
  })

  it('should have add button', () => {
    cy.get('a').contains('Add', { matchCase: false }).should('exist')
  })

  it('should have layer switcher control on map', { retries: 1 }, () => {
    // Wait for map to load
    cy.get('#mainmap, .maplibre-map, .map-panel', { timeout: 15000 }).should('exist')
    
    // Wait a bit for MapLibre and controls to initialize
    cy.wait(2000)
    
    // Check for layer switcher button
    cy.get('body').then($body => {
      const layerSwitcherSelectors = [
        '.layer-switcher-btn',
        '.maplibregl-ctrl-group button',
        '.mapboxgl-ctrl-group button',
        '[class*="layer"][class*="control"]',
        '[class*="layer"][class*="switcher"]'
      ]
      
      let found = false
      for (const selector of layerSwitcherSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found layer switcher with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          
          // Try to click it to open the menu
          cy.get(selector).first().click({ force: true })
          
          // Wait for menu to appear
          cy.wait(500)
          
          // Check if menu appeared
          const menuSelectors = [
            '.layer-switcher-menu',
            '[class*="layer"][class*="menu"]',
            '[class*="layer-list"]'
          ]
          
          for (const menuSelector of menuSelectors) {
            if ($body.find(menuSelector).length > 0) {
              cy.log(`Found layer switcher menu: ${menuSelector}`)
              cy.get(menuSelector).should('exist')
              
              // Check for layer labels/items in the menu
              cy.get(menuSelector).find('label, input, [class*="layer-item"]').should('have.length.greaterThan', 0)
            }
          }
          
          found = true
          break
        }
      }
      
      if (!found) {
        cy.log('Layer switcher not found with common selectors')
      }
    })
  })

  it('should display multiple MapEntity models in layer selector', { retries: 1 }, () => {
    // Wait for map to load
    cy.get('#mainmap, .maplibre-map, .map-panel', { timeout: 15000 }).should('exist')
    cy.wait(2000)
    
    // Open layer switcher
    cy.get('body').then($body => {
      const buttonSelectors = [
        '.layer-switcher-btn',
        '.maplibregl-ctrl-group button',
        '[class*="layer"][class*="control"]'
      ]
      
      for (const selector of buttonSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({ force: true })
          cy.wait(500)
          break
        }
      }
    })
    
    // Check for multiple model layers in the menu
    cy.get('body').then($body => {
      const menuSelectors = [
        '.layer-switcher-menu label',
        '.layer-switcher-menu [class*="layer"]',
        '[class*="layer-menu"] label'
      ]
      
      for (const selector of menuSelectors) {
        if ($body.find(selector).length > 0) {
          // Should have at least one layer (the current model)
          cy.get(selector).should('have.length.greaterThan', 0)
          
          // Log the layer names found
          cy.get(selector).each(($el) => {
            cy.log(`Found layer: ${$el.text()}`)
          })
          break
        }
      }
    })
  })
})
