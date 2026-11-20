describe('Layer Switcher - Base Layer and Overlay', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/list/')
        // Wait for map to be ready
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
        // Wait for the layers API response to be fully loaded
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

    it('should add overlay source to map when activating overlay', () => {
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

        // Verify the overlay source was added to the map style
        cy.window({timeout: 10000}).should((win) => {
            const map = win.MapEntity.currentMap.map.getMap()
            const style = map.getStyle()
            const sourceNames = Object.keys(style.sources)
            const hasOverlaySource = sourceNames.some(name => name.includes('cadastre') || name.includes('overlay') || name.includes('ign'))
            expect(hasOverlaySource, 'overlay source added to map').to.be.true
        })
    })

    it('should keep layer switcher menu above point markers with custom z-index', () => {
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        cy.window().then((win) => {
            const doc = win.document
            const canvasContainer = doc.querySelector('.maplibregl-canvas-container')
            const menu = doc.querySelector('.layer-switcher-menu')
            expect(win.getComputedStyle(canvasContainer).isolation).to.equal('isolate')

            const marker = doc.createElement('div')
            marker.className = 'maplibregl-marker'
            marker.style.zIndex = '9999'
            marker.style.width = '40px'
            marker.style.height = '40px'
            marker.style.pointerEvents = 'auto'

            const mapRect = doc.querySelector('.maplibregl-map').getBoundingClientRect()
            const menuRect = menu.getBoundingClientRect()
            marker.style.left = `${menuRect.left - mapRect.left + 10}px`
            marker.style.top = `${menuRect.top - mapRect.top + 10}px`
            canvasContainer.appendChild(marker)

            try {
                const topEl = doc.elementFromPoint(menuRect.left + 20, menuRect.top + 20)
                expect(menu.contains(topEl), 'layer switcher menu stays on top of marker').to.be.true
            } finally {
                marker.remove()
            }
        })
    })
})
