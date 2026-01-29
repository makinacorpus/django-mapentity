describe('DummyModel Detail View', () => {
  let entityId

  before(() => {
    cy.login()
    cy.visit('/dummymodel/list/')
    // Get the first entity ID from the list
    cy.get('tbody tr').first().find('a').first().invoke('attr', 'href').then((href) => {
      const match = href.match(/\/dummymodel\/(\d+)\//)
      if (match) {
        entityId = match[1]
      }
    })
  })

  beforeEach(() => {
    cy.login()
  })

  it('should display entity details', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.get('.mapentity-detail').should('be.visible')
  })

  it('should display map with entity geometry', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.waitForMap()
    cy.get('.leaflet-container').should('be.visible')
  })

  it('should have edit button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.get('a').contains('Edit').should('be.visible')
  })

  it('should have delete button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.get('a').contains('Delete').should('be.visible')
  })

  it('should navigate to edit page when clicking edit button', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    cy.get('a').contains('Edit').click()
    cy.url().should('include', `/dummymodel/edit/${entityId}/`)
  })

  it('should display entity attributes', () => {
    cy.visit(`/dummymodel/${entityId}/`)
    // Check that some attributes are displayed
    cy.contains('Name').should('be.visible')
  })
})
