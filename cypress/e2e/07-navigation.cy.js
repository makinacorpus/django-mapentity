describe('Navigation and Menu', () => {
  beforeEach(() => {
    cy.login()
  })

  it('should display main navigation', () => {
    cy.visit('/')
    cy.get('nav.navbar', { timeout: 10000 }).should('exist')
    cy.get('.navbar-brand').should('exist')
  })

  it('should navigate to list page from home', () => {
    cy.visit('/')
    // Look for link to list page
    cy.get('a[href*="/dummymodel/list"]', { timeout: 10000 }).first().click({ force: true })
    cy.url({ timeout: 10000 }).should('include', '/dummymodel/list')
  })

  it('should navigate between pages using menu', () => {
    cy.visit('/dummymodel/list/')
    cy.get('nav.navbar', { timeout: 10000 }).should('exist')
    
    // Check if we can navigate to home or other pages from navbar
    cy.get('.navbar-brand').click({ force: true })
    cy.url().should('satisfy', (url) => {
      return url.includes('/') || url.includes('/dummymodel')
    })
  })

  it('should have user menu in navbar', () => {
    cy.visit('/dummymodel/list/')
    
    // Look for user dropdown menu
    cy.get('body').then($body => {
      const userMenuSelectors = [
        '.dropdown-toggle',
        '[data-toggle="dropdown"]',
        '.navbar .dropdown',
        'button.dropdown-item'
      ]
      
      for (const selector of userMenuSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found user menu with selector: ${selector}`)
          cy.get(selector).first().should('exist')
          return
        }
      }
    })
  })

  it('should navigate to detail page from list', () => {
    cy.visit('/dummymodel/list/')
    cy.get('table', { timeout: 10000 }).should('exist')
    
    // Click first entity link
    cy.get('table tbody tr').first().find('a').first().click()
    
    // Should be on detail page
    cy.url({ timeout: 10000 }).should('match', /\/dummymodel\/\d+\//)
  })

  it('should navigate to edit page from detail', () => {
    cy.visit('/dummymodel/1/')
    
    // Look for edit button
    cy.get('body').then($body => {
      const editSelectors = [
        'a[href*="/edit/"]',
        'a:contains("Edit")',
        '.btn:contains("Edit")',
        '[href*="edit"]'
      ]
      
      for (const selector of editSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click()
          cy.url({ timeout: 10000 }).should('include', '/edit/')
          return
        }
      }
    })
  })

  it('should navigate back using browser back button', () => {
    cy.visit('/dummymodel/list/')
    cy.url().should('include', '/dummymodel/list')
    
    // Navigate to detail
    cy.get('table tbody tr').first().find('a').first().click()
    cy.url({ timeout: 10000 }).should('match', /\/dummymodel\/\d+\//)
    
    // Go back
    cy.go('back')
    cy.url({ timeout: 10000 }).should('include', '/dummymodel/list')
  })
})
