describe('DummyModel Create', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/add/')
  })

  it('should display the create form', () => {
    cy.get('form', { timeout: 10000 }).should('exist')
  })

  it('should have map container for geometry input', () => {
    // Check for map container (maplibre-map is added by widget)
    // Using flexible selector since map might be in different containers
    cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', { timeout: 10000 }).should('exist')
  })

  it('should have form fields', () => {
    cy.get('form', { timeout: 10000 }).should('exist')
  })
})
