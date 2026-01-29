describe('DummyModel List View', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/list/')
  })

  it('should display the list page', () => {
    cy.url().should('include', '/dummymodel/list')
    // Check for either heading or page content
    cy.get('body').should('be.visible')
  })

  it('should display the map', () => {
    cy.get('.leaflet-container', { timeout: 10000 }).should('exist')
  })

  it('should display table with entities', () => {
    cy.get('table', { timeout: 10000 }).should('exist')
  })

  it('should have add button', () => {
    cy.get('a').contains('Add', { matchCase: false }).should('exist')
  })
})
