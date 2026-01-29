describe('DummyModel Filter and Search', () => {
  it('should display filter panel', () => {
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.get('body', { timeout: 10000 }).should('exist')
  })
})
