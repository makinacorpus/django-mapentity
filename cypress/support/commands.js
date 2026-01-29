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

// Command to wait for map to be ready
Cypress.Commands.add('waitForMap', () => {
  cy.get('.leaflet-container', { timeout: 10000 }).should('be.visible')
  // Wait for map tiles to load instead of arbitrary timeout
  cy.get('.leaflet-tile-loaded', { timeout: 10000 }).should('exist')
})
