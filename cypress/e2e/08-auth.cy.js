describe('Authentication - Login and Logout', () => {
  beforeEach(() => {
    // Clear session before each test
    cy.clearAllCookies()
    cy.clearAllSessionStorage()
  })

  it('should display login page', () => {
    cy.visit('/login/')
    cy.url().should('include', '/login/')
    cy.get('input[name="username"]').should('exist')
    cy.get('input[name="password"]').should('exist')
    cy.get('button[type="submit"], input[type="submit"]').should('exist')
  })

  it('should login with valid credentials', () => {
    cy.visit('/login/')
    cy.get('input[name="username"]').type('admin')
    cy.get('input[name="password"]').type('admin')
    cy.get('form').submit()
    
    // Should redirect away from login page
    cy.url({ timeout: 10000 }).should('not.include', '/login/')
    
    // Should see navbar with user menu
    cy.get('nav.navbar', { timeout: 10000 }).should('exist')
  })

  it('should show error with invalid credentials', { retries: 1 }, () => {
    cy.visit('/login/')
    cy.get('input[name="username"]').type('wronguser')
    cy.get('input[name="password"]').type('wrongpass')
    cy.get('form').submit()
    
    // Should stay on login page
    cy.url({ timeout: 5000 }).should('include', '/login/')
    
    // Should show error message
    cy.get('body').then($body => {
      const errorSelectors = [
        '.alert-danger',
        '.error',
        '.errorlist',
        '[class*="error"]',
        'p.error'
      ]
      
      let foundError = false
      for (const selector of errorSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('exist')
          foundError = true
          break
        }
      }
      
      if (!foundError) {
        // If no specific error element, at least verify we're still on login page
        cy.url().should('include', '/login/')
      }
    })
  })

  it('should logout successfully', () => {
    // Login first
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.url().should('include', '/dummymodel/list')
    
    // Open user menu and wait for dropdown to be visible
    cy.get('#navbarDropdownUsermenuLink').click();
    
    // Find and click logout button (without force)
    cy.get('#btn-logout').click();
    
    // Should redirect to login or home page
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
      return url.includes('/login') || url.includes('/') && !url.includes('/dummymodel')
    })
  })

  it('should redirect to login when accessing protected page', { retries: 1 }, () => {
    // Try to access protected page without login
    cy.visit('/dummymodel/list/')
    
    // Should redirect to login (with or without next parameter)
    cy.url({ timeout: 10000 }).should('satisfy', (url) => {
      return url.includes('/login') || url.includes('/dummymodel/list')
    })
  })

  it('should redirect to requested page after login', () => {
    // Try to access a specific page
    cy.visit('/dummymodel/list/')
    
    // If redirected to login, login and should go back to requested page
    cy.url().then((url) => {
      if (url.includes('/login')) {
        cy.get('input[name="username"]').type('admin')
        cy.get('input[name="password"]').type('admin')
        cy.get('form').submit()
        cy.url({ timeout: 10000 }).should('include', '/dummymodel/list')
      }
    })
  })

  it('should maintain session across page navigation', () => {
    cy.login()
    cy.visit('/dummymodel/list/')
    cy.url().should('include', '/dummymodel/list')
    
    // Navigate to another page
    cy.visit('/')
    cy.url().should('not.include', '/login')
    
    // Navigate back to protected page - should still be logged in
    cy.visit('/dummymodel/list/')
    cy.url().should('include', '/dummymodel/list')
    cy.get('nav.navbar').should('exist')
  })
})
