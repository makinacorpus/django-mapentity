describe('DummyModel Update', () => {
  let entityId

  before(() => {
    cy.login()
    cy.visit('/dummymodel/list/')
    // Get the first entity ID from the list
    cy.get('tbody tr').first().find('a').first().invoke('attr', 'href').then((href) => {
      const match = href.match(/\/dummymodel\/(\d+)\//)
      if (match) {
        entityId = match[1]
      }
    })
  })

  beforeEach(() => {
    cy.login()
  })

  it('should display the update form', () => {
    cy.visit(`/dummymodel/edit/${entityId}/`)
    cy.get('form').should('be.visible')
  })

  it('should display map for geometry editing', () => {
    cy.visit(`/dummymodel/edit/${entityId}/`)
    cy.waitForMap()
    cy.get('.leaflet-container').should('be.visible')
  })

  it('should have form fields pre-filled', () => {
    cy.visit(`/dummymodel/edit/${entityId}/`)
    cy.get('input[name="name"]').should('have.value')
  })

  it('should update entity successfully', () => {
    cy.visit(`/dummymodel/edit/${entityId}/`)
    
    const updatedName = `Updated Dummy ${Date.now()}`
    cy.get('input[name="name"]').clear().type(updatedName)
    
    // Submit the form
    cy.get('button[type="submit"]').click()
    
    // Should redirect to detail page
    cy.url().should('match', /\/dummymodel\/\d+\/$/, { timeout: 10000 })
    cy.contains(updatedName).should('be.visible')
  })

  it('should cancel edit and go back', () => {
    cy.visit(`/dummymodel/edit/${entityId}/`)
    
    // Look for cancel button or link
    cy.get('a').contains('Cancel').click()
    
    // Should go back to detail or list page
    cy.url().should('not.include', '/edit/')
  })
})
