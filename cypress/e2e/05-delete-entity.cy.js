describe('DummyModel Delete', () => {
  let entityToDeleteId

  beforeEach(() => {
    cy.login()
    // Create a fresh entity to delete for each test
    cy.visit('/dummymodel/add/')
    
    const testName = `Entity to Delete ${Date.now()}`
    cy.get('input[name="name"]').type(testName)
    cy.get('textarea[name="short_description"]').type('Test entity for deletion')
    
    // Add geometry
    cy.waitForMap()
    cy.get('.leaflet-container').click(640, 360)
    cy.wait(500)
    
    // Submit
    cy.get('button[type="submit"]').click()
    
    // Get the ID from the URL
    cy.url({ timeout: 10000 }).should('match', /\/dummymodel\/(\d+)\/$/).then((url) => {
      const match = url.match(/\/dummymodel\/(\d+)\//)
      if (match) {
        entityToDeleteId = match[1]
      }
    })
  })

  it('should display delete confirmation page', () => {
    cy.visit(`/dummymodel/${entityToDeleteId}/`)
    cy.get('a').contains('Delete').click()
    cy.url().should('include', `/dummymodel/delete/${entityToDeleteId}/`)
    cy.contains('Are you sure').should('be.visible')
  })

  it('should delete entity successfully', () => {
    cy.visit(`/dummymodel/delete/${entityToDeleteId}/`)
    
    // Confirm deletion
    cy.get('button[type="submit"]').contains('Delete').click()
    
    // Should redirect to list page
    cy.url().should('include', '/dummymodel/list', { timeout: 10000 })
    
    // Verify entity is deleted by trying to access it (should get 404 or redirect)
    cy.request({
      url: `/dummymodel/${entityToDeleteId}/`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.be.oneOf([404, 302])
    })
  })

  it('should cancel delete and return to detail page', () => {
    cy.visit(`/dummymodel/delete/${entityToDeleteId}/`)
    
    // Cancel deletion
    cy.get('a').contains('Cancel').click()
    
    // Should go back to detail page
    cy.url().should('include', `/dummymodel/${entityToDeleteId}/`)
  })
})
