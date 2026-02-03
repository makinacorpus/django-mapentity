describe('DummyModel Create', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/add/')
    })

    it('should display the create form', () => {
        cy.get('form', {timeout: 10000}).should('exist')
    })

    it('should have map container for geometry input', () => {
        // Check for map container (maplibre-map is added by widget)
        // Using flexible selector since map might be in different containers
        cy.get('.maplibre-map, #mainmap, .map-panel, [id*="map"]', {timeout: 10000}).should('exist')
    })

    it('should have draw marker button', () => {
        cy.get('#id_draw_marker', {timeout: 10000}).should('exist')
    });

    it('should show validation error when submitting without geometry', () => {
        // Fill only text fields without drawing geometry
        cy.get('input[name="name_en"]', {timeout: 10000}).type('Test Entity Without Geom')

        cy.setTinyMceContent('id_short_description', 'Test short description');

        cy.setTinyMceContent('id_description', 'Test description');

        // Try to submit - should fail validation
        cy.get('#save_changes').click()

        // Should stay on the same page with validation error
        cy.url().should('include', '/dummymodel/add/')
    })

    it('should create entity successfully with all required fields and geometry', {retries: 2}, () => {
        const entityName = `Test Entity ${Date.now()}`

        // Fill in required fields
        cy.get('input[name="name_en"]', {timeout: 10000}).clear().type(entityName)

        cy.setTinyMceContent('id_short_description', 'Test short description');

        cy.setTinyMceContent('id_description', 'Test description');

        // Wait for map to be ready
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist')

        // Wait a bit for Geoman to initialize
        cy.wait(2000)

        cy.get('#id_draw_marker').click();

        cy.get('.maplibregl-canvas').click(400, 300);

        // Wait a bit for geometry to be registered
        cy.wait(1000)

        // Submit the form
        cy.get('#save_changes').click()

        // Should redirect to detail or list page
        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/dummymodel/') && !url.includes('/add/')
        })

        // Verify the entity name appears
        cy.contains(entityName, {timeout: 10000}).should('exist')
    })
})
