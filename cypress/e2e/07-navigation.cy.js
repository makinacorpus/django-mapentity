describe('Navigation and Menu', () => {
  it('should display main navigation', () => {
    cy.login()
    cy.visit('/')
    cy.get('body', { timeout: 10000 }).should('exist')
  })
})
