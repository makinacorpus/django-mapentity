describe('DummyModel List View', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/')
  })

  it('should display the list page', () => {
    cy.contains('Dummy Models').should('be.visible')
    cy.url().should('include', '/dummymodel/list')
  })

  it('should display the map', () => {
    cy.waitForMap()
    cy.get('.leaflet-container').should('be.visible')
  })

  it('should display table with entities', () => {
    cy.get('table').should('be.visible')
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('should have working search functionality', () => {
    cy.get('input[type="search"]').should('be.visible').type('dummy')
    cy.get('tbody tr').should('be.visible')
  })

  it('should have add button', () => {
    cy.get('a').contains('Add').should('be.visible')
  })

  it('should navigate to detail view when clicking on entity', () => {
    cy.get('tbody tr').first().find('a').first().click()
    cy.url().should('match', /\/dummymodel\/\d+\/$/)
  })
})
