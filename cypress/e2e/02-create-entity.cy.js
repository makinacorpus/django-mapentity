describe('DummyModel Create', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dummymodel/add/')
  })

  it('should display the create form', () => {
    cy.get('form').should('be.visible')
    cy.contains('Add Dummy Model').should('be.visible')
  })

  it('should display map for geometry input', () => {
    cy.waitForMap()
    cy.get('.leaflet-container').should('be.visible')
  })

  it('should have required form fields', () => {
    cy.get('input[name="name"]').should('be.visible')
    cy.get('textarea[name="short_description"]').should('be.visible')
    cy.get('textarea[name="description"]').should('be.visible')
  })

  it('should create a new entity', () => {
    // Fill in the form
    cy.get('input[name="name"]').type('Test Dummy Entity')
    cy.get('textarea[name="short_description"]').type('This is a test short description')
    cy.get('textarea[name="description"]').type('This is a test description')
    
    // Click on map to add a point
    cy.waitForMap()
    cy.get('.leaflet-container').click(640, 360)
    
    // Submit the form (button should become enabled after adding geometry)
    cy.get('button[type="submit"]').should('be.enabled').click()
    
    // Should redirect to detail page
    cy.url().should('match', /\/dummymodel\/\d+\/$/, { timeout: 10000 })
    cy.contains('Test Dummy Entity').should('be.visible')
  })

  it('should show validation errors for empty required fields', () => {
    // Try to submit without filling required fields
    cy.get('button[type="submit"]').click()
    
    // Should stay on the same page or show validation errors
    cy.url().should('include', '/dummymodel/add/')
  })
})
