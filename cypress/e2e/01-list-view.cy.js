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
})
