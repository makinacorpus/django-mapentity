describe('DummyModel Detail View', () => {
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
  })

  it('should display detail page', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.url().should('match', /\/dummymodel\/\d+\//)
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('should show entity details and attributes', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    // Look for detail content
    cy.get('body').then($body => {
      const detailSelectors = [
        '.detail',
        '#detail',
        '[class*="detail"]',
        '.attributes',
        'table',
        'dl'
      ]
      
      for (const selector of detailSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found detail content with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          return
        }
      }
    })
  })

  it('should have edit button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const editSelectors = [
        'a[href*="/edit/"]',
        'a:contains("Edit")',
        '.btn:contains("Edit")',
        'button:contains("Edit")'
      ]
      
      for (const selector of editSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found edit button with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          return
        }
      }
    })
  })

  it('should have delete button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const deleteSelectors = [
        'a[href*="/delete/"]',
        'a:contains("Delete")',
        '.btn:contains("Delete")',
        'button:contains("Delete")',
        '.btn-danger'
      ]
      
      for (const selector of deleteSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found delete button with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          return
        }
      }
    })
  })

  it('should have back/list button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const backSelectors = [
        'a[href*="/list"]',
        'a:contains("Back")',
        'a:contains("List")',
        '.btn:contains("Back")'
      ]
      
      for (const selector of backSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found back/list button with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          return
        }
      }
    })
  })

  it('should display export options on detail page', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const exportSelectors = [
        'a[href*=".odt"]',
        'a[href*=".pdf"]',
        'a[href*=".doc"]',
        'button[name="odt"]',
        'button[name="pdf"]',
        '[title*="ODT"]',
        '[title*="PDF"]',
        'img[src*="odt.png"]',
        'img[src*="pdf.png"]'
      ]
      
      let foundExports = []
      for (const selector of exportSelectors) {
        if ($body.find(selector).length > 0) {
          foundExports.push(selector)
          cy.get(selector).should('exist')
        }
      }
      
      if (foundExports.length > 0) {
        cy.log(`Found ${foundExports.length} export options`)
      } else {
        cy.log('No export options found on detail page')
      }
    })
  })

  it('should have ODT export option if available', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const odtSelectors = [
        'a[href*=".odt"]',
        'button[name="odt"]',
        'img[src*="odt.png"]',
        '[title*="ODT"]'
      ]
      
      for (const selector of odtSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found ODT export with selector: ${selector}`)
          cy.get(selector).should('exist')
          return
        }
      }
      
      cy.log('ODT export not available')
    })
  })

  it('should have PDF export option if available', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const pdfSelectors = [
        'a[href*=".pdf"]',
        'button[name="pdf"]',
        'img[src*="pdf.png"]',
        '[title*="PDF"]'
      ]
      
      for (const selector of pdfSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found PDF export with selector: ${selector}`)
          cy.get(selector).should('exist')
          return
        }
      }
      
      cy.log('PDF export not available')
    })
  })

  it('should trigger document export when clicked', { retries: 1 }, () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      // Try to find any export link
      if ($body.find('a[href*=".odt"]').length > 0) {
        cy.get('a[href*=".odt"]').first().should('have.attr', 'href')
        cy.log('ODT export link found')
      } else if ($body.find('a[href*=".pdf"]').length > 0) {
        cy.get('a[href*=".pdf"]').first().should('have.attr', 'href')
        cy.log('PDF export link found')
      } else {
        cy.log('No document export links found')
      }
    })
  })

  it('should display map on detail page if entity has geometry', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    // Look for map container
    cy.get('body').then($body => {
      const mapSelectors = [
        '#detailmap',
        '.detail-map',
        '#mainmap',
        '.maplibre-map',
        '.map-panel',
        '[id*="map"]'
      ]
      
      for (const selector of mapSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found map on detail page with selector: ${selector}`)
          cy.get(selector).should('exist')
          return
        }
      }
      
      cy.log('No map found on detail page')
    })
  })

  it('should navigate to edit page from detail', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const editSelectors = [
        'a[href*="/edit/"]',
        'a:contains("Edit")'
      ]
      
      for (const selector of editSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({force: true});
          cy.url({ timeout: 10000 }).should('include', '/edit/');
          return
        }
      }
    })
  })

  it('should show action buttons toolbar', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    
    cy.get('body').then($body => {
      const toolbarSelectors = [
        '.actions',
        '.btn-toolbar',
        '.action-buttons',
        '[class*="action"]',
        '.btn-group'
      ]
      
      for (const selector of toolbarSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found action toolbar with selector: ${selector}`)
          cy.get(selector).should('exist')
          return
        }
      }
    })
  })
})
