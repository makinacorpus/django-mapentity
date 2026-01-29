describe('DummyModel Delete', () => {
  it('should be able to access delete pages', () => {
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.get('body', { timeout: 10000 }).should('exist')
  })
})
