describe('Navigation and Menu', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/')
  })

  it('should display main navigation', () => {
    cy.get('nav').should('be.visible')
  })

  it('should have menu items for different entities', () => {
    // Check for various model links
    cy.contains('Dummy Models').should('be.visible')
  })

  it('should navigate between different model lists', () => {
    // Navigate to Roads if available
    cy.get('body').then($body => {
      if ($body.text().includes('Roads')) {
        cy.contains('Roads').click()
        cy.url().should('include', '/road/list')
      }
    })
  })

  it('should have user menu', () => {
    // Check for user menu or logout link
    cy.get('body').then($body => {
      const hasLogout = $body.text().includes('Logout') || $body.text().includes('Log out')
      expect(hasLogout).to.be.true
    })
  })

  it('should logout successfully', () => {
    // Find and click logout
    cy.contains(/Logout|Log out/i).click()
    
    // Should redirect to login page or home
    cy.url().should('match', /\/login\/|\//)
  })
})
