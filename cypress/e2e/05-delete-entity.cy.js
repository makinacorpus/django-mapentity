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

  it('should delete multiple entities via list actions', () => {
    // Go to list view
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    cy.get(".dt-select-checkbox").first().click();
    cy.get("#btn-batch-editing").first().click();
    cy.get("#btn-delete").first().click();
    
    cy.get('form').get('input[type=submit]').click({ force: true })

  })
})
