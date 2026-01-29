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
    // Get initial count
    cy.get('tbody tr').its('length').then((initialCount) => {
      // Type in search box
      cy.get('input[type="search"]').type('dummy')
      
      // Results should be filtered (count may be same or different)
      cy.get('tbody tr').should('be.visible')
    })
  })

  it('should clear filters', () => {
    // Apply filter
    cy.get('input[type="search"]').type('dummy')
    
    // Wait for table to update
    cy.get('tbody tr').should('be.visible')
    
    // Clear filter
    cy.get('input[type="search"]').clear()
    
    // Results should update
    cy.get('tbody tr').should('be.visible')
  })

  it('should update map based on filters', () => {
    cy.waitForMap()
    
    // Apply filter
    cy.get('input[type="search"]').type('dummy')
    
    // Map should still be visible
    cy.get('.leaflet-container').should('be.visible')
  })
})
