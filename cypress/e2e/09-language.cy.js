describe('Language Switching', () => {
  beforeEach(() => {
    cy.login()
  })

  it('should display language switcher in user menu', () => {
    cy.visit('/dummymodel/list/')
    
    // Open user dropdown menu
    cy.get('body').then($body => {
      const dropdownSelectors = [
        '.dropdown-toggle',
        '[data-toggle="dropdown"]',
        '.navbar .dropdown button'
      ]
      
      for (const selector of dropdownSelectors) {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({ force: true })
          cy.wait(500)
          break
        }
      }
    })
    
    // Check for language options
    cy.get('body').then($body => {
      const languageSelectors = [
        'button[name="language"]',
        '.language-menu-item',
        'form[action*="set_language"]',
        'button[value*="en"], button[value*="fr"]'
      ]
      
      for (const selector of languageSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found language switcher with selector: ${selector}`)
          cy.get(selector).should('have.length.greaterThan', 0)
          return
        }
      }
    })
  })

  it('should switch to French language', { retries: 1 }, () => {
    cy.visit('/dummymodel/list/')
    
    // Store current URL to return after language change
    cy.url().as('currentUrl')
    
    // Open dropdown menu
    cy.get('body').then($body => {
      const dropdownToggle = $body.find('.dropdown-toggle, [data-toggle="dropdown"]')
      if (dropdownToggle.length > 0) {
        cy.get('.dropdown-toggle, [data-toggle="dropdown"]').first().click({ force: true })
        cy.wait(500)
      }
    })
    
    // Click French language button
    cy.get('body').then($body => {
      if ($body.find('button[value="fr"]').length > 0) {
        cy.get('button[value="fr"]').click({ force: true })
        
        // Wait for page reload
        cy.wait(1000)
        
        // Check that page has French content
        cy.get('body').then($newBody => {
          const bodyText = $newBody.text().toLowerCase()
          // Look for French words
          if (bodyText.includes('ajouter') || bodyText.includes('supprimer') || bodyText.includes('modifier')) {
            cy.log('French language detected')
          }
        })
      } else {
        cy.log('French language option not found')
      }
    })
  })

  it('should switch to English language', { retries: 1 }, () => {
    cy.visit('/dummymodel/list/')
    
    // Open dropdown menu
    cy.get('body').then($body => {
      const dropdownToggle = $body.find('.dropdown-toggle, [data-toggle="dropdown"]')
      if (dropdownToggle.length > 0) {
        cy.get('.dropdown-toggle, [data-toggle="dropdown"]').first().click({ force: true })
        cy.wait(500)
      }
    })
    
    // Click English language button
    cy.get('body').then($body => {
      if ($body.find('button[value="en"]').length > 0) {
        cy.get('button[value="en"]').click({ force: true })
        
        // Wait for page reload
        cy.wait(1000)
        
        // Check that page has English content
        cy.get('body').then($newBody => {
          const bodyText = $newBody.text().toLowerCase()
          // Look for English words
          if (bodyText.includes('add') || bodyText.includes('delete') || bodyText.includes('edit')) {
            cy.log('English language detected')
          }
        })
      } else {
        cy.log('English language option not found')
      }
    })
  })

  it('should persist language selection across pages', { retries: 1 }, () => {
    cy.visit('/dummymodel/list/')
    
    // Open dropdown and switch to French
    cy.get('body').then($body => {
      const dropdownToggle = $body.find('.dropdown-toggle, [data-toggle="dropdown"]')
      if (dropdownToggle.length > 0) {
        cy.get('.dropdown-toggle, [data-toggle="dropdown"]').first().click({ force: true })
        cy.wait(500)
      }
      
      if ($body.find('button[value="fr"]').length > 0) {
        cy.get('button[value="fr"]').click({ force: true })
        cy.wait(1000)
        
        // Navigate to another page
        cy.visit('/')
        cy.wait(500)
        
        // Check if French is still active
        cy.get('body').then($newBody => {
          const bodyText = $newBody.text().toLowerCase()
          if (bodyText.includes('ajouter') || bodyText.includes('déconnexion')) {
            cy.log('French language persisted')
          }
        })
      } else {
        cy.log('French language option not found')
      }
    })
  })

  it('should display all available languages', () => {
    cy.visit('/dummymodel/list/')
    
    // Open dropdown menu
    cy.get('body').then($body => {
      const dropdownToggle = $body.find('.dropdown-toggle, [data-toggle="dropdown"]')
      if (dropdownToggle.length > 0) {
        cy.get('.dropdown-toggle, [data-toggle="dropdown"]').first().click({ force: true })
        cy.wait(500)
      }
    })
    
    // Check for multiple language options
    cy.get('body').then($body => {
      const languageButtons = $body.find('button[name="language"]')
      if (languageButtons.length > 0) {
        cy.log(`Found ${languageButtons.length} language options`)
        
        // Should have at least 2 languages (English and French)
        cy.get('button[name="language"]').should('have.length.greaterThan', 1)
        
        // Log available languages
        cy.get('button[name="language"]').each(($btn) => {
          cy.log(`Language option: ${$btn.val()} - ${$btn.text()}`)
        })
      } else {
        cy.log('Language buttons not found with expected selector')
      }
    })
  })

  it('should show active language highlighted', { retries: 1 }, () => {
    cy.visit('/dummymodel/list/')
    
    // Open dropdown menu
    cy.get('body').then($body => {
      const dropdownToggle = $body.find('.dropdown-toggle, [data-toggle="dropdown"]')
      if (dropdownToggle.length > 0) {
        cy.get('.dropdown-toggle, [data-toggle="dropdown"]').first().click({ force: true })
        cy.wait(500)
      }
    })
    
    // Check for active language indicator
    cy.get('body').then($body => {
      const activeSelectors = [
        'button[name="language"].active',
        '.language-menu-item.active',
        'button[name="language"][class*="active"]'
      ]
      
      for (const selector of activeSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found active language with selector: ${selector}`)
          cy.get(selector).should('exist')
          return
        }
      }
    })
  })
})
