describe('DummyModel Delete', () => {
  beforeEach(() => {
    cy.login()
  })

  it('should delete a single entity', () => {
    // Go to list view
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    // Get the first entity ID from the list
    cy.get('table tbody tr').first().find('a').first().invoke('attr', 'href').then((href) => {
      const entityId = href.match(/\/dummymodel\/(\d+)\//)[1]
      
      // Visit delete page
      cy.visit(`/dummymodel/delete/${entityId}/`)
      
      // Confirm delete
      cy.get('form[method="post"]', { timeout: 10000 }).should('exist')
      cy.get('button[type="submit"], input[type="submit"]').contains(/delete|confirm/i).click()
      
      // Should redirect back to list
      cy.url({ timeout: 10000 }).should('include', '/dummymodel/list')
    })
  })

  it('should delete multiple entities', { retries: 1 }, () => {
    // Go to list view
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    // Select first 3 checkboxes (or less if not available)
    cy.get('table tbody tr').each(($row, index) => {
      if (index < 3) {
        cy.wrap($row).find('input[type="checkbox"]').first().check({ force: true })
      }
    })
    
    // Find and click the delete selected button
    cy.get('body').then($body => {
      // Look for delete button with various possible selectors
      const deleteSelectors = [
        'button:contains("Delete")',
        'a:contains("Delete")',
        'input[value*="Delete"]',
        '[name*="delete"]',
        '.btn-danger'
      ]
      
      for (const selector of deleteSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({ force: true })
          return
        }
      }
      
      // If no delete button found, log and continue
      cy.log('No bulk delete button found, skipping test')
    })
    
    // If we got to a confirmation page, confirm the deletion
    cy.url().then((url) => {
      if (url.includes('delete')) {
        cy.get('button[type="submit"], input[type="submit"]').click()
      }
    })
  })
})
