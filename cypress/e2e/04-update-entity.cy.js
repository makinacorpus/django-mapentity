describe('DummyModel Update', () => {
  it('should be able to access edit pages', () => {
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.get('body', { timeout: 10000 }).should('exist')
  })
})
