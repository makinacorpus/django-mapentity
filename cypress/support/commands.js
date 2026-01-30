// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Login command for authenticated tests
Cypress.Commands.add('login', (username = 'admin', password = 'admin') => {
  cy.session([username, password], () => {
    cy.visit('/login/')
    cy.get('input[name="username"]').type(username)
    cy.get('input[name="password"]').type(password)
    cy.get('form').submit()
    cy.url().should('not.include', '/login/')
  })
})

// Command to wait for map to be ready (MapLibre instead of Leaflet)
Cypress.Commands.add('waitForMap', () => {
  // Check for various map container selectors (more flexible)
  cy.get('.maplibre-map, #mainmap, .map-panel', { timeout: 10000 }).should('be.visible')
})

// Command to open user dropdown menu
Cypress.Commands.add('openUserMenu', () => {
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
        return
      }
    }
  })
})

// Command to find and click element using multiple selectors
Cypress.Commands.add('findAndClick', (selectors, options = {}) => {
  cy.get('body').then($body => {
    for (const selector of selectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Found element with selector: ${selector}`)
        cy.get(selector).first().click(options)
        return
      }
    }
    cy.log(`No element found with any of the provided selectors`)
  })
})

// Command to check if element exists using multiple selectors
Cypress.Commands.add('findElement', (selectors, options = {}) => {
  cy.get('body').then($body => {
    for (const selector of selectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Found element with selector: ${selector}`)
        return cy.get(selector).first()
      }
    }
    cy.log(`No element found with any of the provided selectors`)
    return cy.wrap(null)
  })
})

Cypress.Commands.add('setTinyMceContent', (tinyMceId, content) => {
  cy.window().then((win) => {
    const editor = win.tinymce.get(tinyMceId);
    if (editor) {
      editor.setContent(content);
    }
  });
});

Cypress.Commands.add('getTinyMceContent', (tinyMceId, content) => {
  cy.window().then((win) => {
    const editor = win.tinymce.get(tinyMceId);
    if (editor) {
      return editor.getContent();
    }
    return '';
  });
});