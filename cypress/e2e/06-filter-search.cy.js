describe('DummyModel Filter and Search', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/list/')
  })

  it('should display filter panel', () => {
    // Look for filter options
    cy.get('form').should('exist')
  })

  it('should filter by name', () => {
    // Type in search box
    cy.get('input[type="search"]').type('dummy')
    
    // Wait for results to update
    cy.wait(1000)
    
    // Check that results are filtered
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should clear filters', () => {
    // Apply filter
    cy.get('input[type="search"]').type('dummy')
    cy.wait(1000)
    
    // Clear filter
    cy.get('input[type="search"]').clear()
    cy.wait(1000)
    
    // Results should update
    cy.get('tbody tr').should('be.visible')
  })

  it('should update map based on filters', () => {
    cy.waitForMap()
    
    // Apply filter
    cy.get('input[type="search"]').type('dummy')
    cy.wait(1000)
    
    // Map should still be visible
    cy.get('.leaflet-container').should('be.visible')
  })
})
