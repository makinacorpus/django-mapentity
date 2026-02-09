describe('Map Context - Base layer, overlays and current object layer', () => {

    function openLayerSwitcher() {
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')
    }

    function waitForMapReady() {
        cy.get('#mainmap, #detailmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
        cy.wait('@baselayers', {timeout: 15000})
    }

    describe('List view', () => {
        beforeEach(() => {
            cy.intercept('/mapbox/mapbox-baselayers/').as('baselayers')
            cy.login()
            cy.mockTiles()
        })

        it('should have the first base layer selected and Objects layer checked by default', () => {
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            // Wait for base layers
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // First base layer should be checked by default
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')

            // Objects category overlay (current model) should be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 0)

            // The "Overlays" category checkbox (e.g. cadastre) should NOT be checked by default
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

            // The "Objects" category checkbox (current model layer) should be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').last()
                .should('be.checked')
        })

        it('should restore the selected base layer after page reload', () => {
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            // Wait for base layers
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // First base layer should be checked initially
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('not.be.checked')

            // Switch to second base layer
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

            // Wait for context to be saved
            cy.wait(1000)

            // Reload the page
            cy.reload()
            waitForMapReady()

            openLayerSwitcher()
            
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the second base layer should still be selected (not the first)
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
        })

        it('should restore the activated overlay after page reload', () => {
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            // Wait for overlays
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // The first overlay (Overlays category, e.g. cadastre) should not be checked initially
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

            // Activate the first overlay
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .check({force: true})
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('be.checked')

            // Wait for context to be saved
            cy.wait(1000)

            // Reload the page
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the first overlay should still be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('be.checked')

            // The Objects layer should still be checked too
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').last()
                .should('be.checked')
        })
    })

    describe('Detail view', () => {
        let entityId

        beforeEach(() => {
            cy.intercept('/mapbox/mapbox-baselayers/').as('baselayers')
            cy.login()
            cy.mockTiles()
            // Get an entity ID
            cy.visit('/dummymodel/list/')
            cy.get('table tbody tr', {timeout: 10000}).first().find('a').first().invoke('attr', 'href').then((href) => {
                const match = href.match(/\/dummymodel\/(\d+)\//)
                if (match) {
                    entityId = match[1]
                }
            })
        })

        it('should have the first base layer selected and Objects layer checked by default', () => {
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()

            openLayerSwitcher()

            // Wait for base layers
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // First base layer should be checked by default
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')

            // Objects category overlay (current model) should be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 0)

            // The "Objects" category checkbox (current model layer) should be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').last()
                .should('be.checked')
        })

        it('should restore the selected base layer after page reload', () => {
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()

            openLayerSwitcher()

            // Wait for base layers
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // First base layer should be checked initially
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('not.be.checked')

            // Switch to second base layer
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

            // Wait for context to be saved
            cy.wait(1000)

            // Reload the page
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()

            openLayerSwitcher()

            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the second base layer should still be selected (not the first)
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
        })

        it('should restore the activated overlay after page reload', () => {
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()

            openLayerSwitcher()

            // Wait for overlays
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // The first overlay should not be checked by default
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

            // Activate the first overlay
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .check({force: true})
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('be.checked')

            // Wait for context to be saved
            cy.wait(1000)

            // Reload the page
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()

            openLayerSwitcher()

            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the first overlay should still be checked
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('be.checked')

            // The Objects layer should still be checked too
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').last()
                .should('be.checked')
        })
    })
})
