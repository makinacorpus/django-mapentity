describe('Layer Switcher - Base Layer and Overlay', () => {
    beforeEach(() => {
        cy.intercept('/mapbox/mapbox-baselayers/').as('baselayers')
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/list/')
        // Wait for map to be ready
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
        // Wait for the layers API response to be fully loaded
        cy.wait('@baselayers', {timeout: 15000})
    })

    it('should change base layer via layer switcher', () => {
        // Open layer switcher menu
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Wait for base layers to be rendered in the layer control
        cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
            .should('have.length.greaterThan', 1)

        // First radio should be checked by default
        cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
    })

    it('should activate an overlay via layer switcher', () => {
        // Open layer switcher menu
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Wait for overlays to be rendered in the layer control
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
            .should('have.length.greaterThan', 1)

        // The overlay should be unchecked by default
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .should('not.be.checked')

        // Activate the overlay
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .check({force: true})

        // Verify the overlay is now checked
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .should('be.checked')
    })

    it('should change base layer and activate overlay together', () => {
        // Open layer switcher menu
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Wait for base layers and overlays to be rendered in the layer control
        cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
            .should('have.length.greaterThan', 1)
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
            .should('have.length.greaterThan', 0)

        // Verify base layer is checked
        cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')

        // Activate overlay
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .check({force: true})
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .should('be.checked')

        // Verify base layer is still checked after activating overlay
        cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
    })

    it('should load tiles when switching base layer', () => {
        // Wait for initial tiles to load (default base layer)
        cy.wait('@tiles_osm', {timeout: 15000})

        // Open layer switcher menu
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Wait for base layers to be rendered
        cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
            .should('have.length.greaterThan', 1)

        // Switch to second base layer (should trigger pbf tile loading)
        cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
        cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

        // Verify pbf tiles are requested after switching
        cy.wait('@tiles_otm', {timeout: 15000})
    })

    it('should load overlay tiles when activating overlay', () => {
        // The overlay (cadastre/PCI) has vector tile layers with minzoom 11+
        // We need to zoom in for MapLibre to request PCI tiles
        cy.window().then(win => {
            const map = win.MapEntity.currentMap.map.getMap()
            map.jumpTo({center: [1.3952, 43.5963], zoom: 14})
        })
        cy.wait(1000)

        // Open layer switcher menu
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Wait for overlays to be rendered
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
            .should('have.length.greaterThan', 0)

        // Activate the overlay
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .check({force: true})

        // Verify the overlay is now checked
        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
            .should('be.checked')

        // Verify overlay pbf tiles are requested after activating overlay
        cy.wait('@tiles_overlay', {timeout: 15000})
    })
})
