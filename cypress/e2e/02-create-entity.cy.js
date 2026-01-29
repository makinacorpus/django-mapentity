describe('DummyModel Create', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/add/')
  })

  it('should display the create form', () => {
    cy.get('form', { timeout: 10000 }).should('exist')
  })

  it('should display map for geometry input', () => {
    cy.get('.leaflet-container', { timeout: 10000 }).should('exist')
  })

  it('should have form fields', () => {
    cy.get('form', { timeout: 10000 }).should('exist')
  })
})
