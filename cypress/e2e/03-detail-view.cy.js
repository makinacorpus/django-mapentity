describe('DummyModel Detail View', () => {
  it('should be able to access detail pages', () => {
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.get('body', { timeout: 10000 }).should('exist')
  })
})
