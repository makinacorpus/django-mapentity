describe('Map Context - Base layer, overlays and current object layer', () => {

    function openLayerSwitcher() {
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')
    }

    function waitForMapReady() {
        cy.get('#mainmap, #detailmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
    }

    describe('Context restoration via URL', () => {
        beforeEach(() => {
            cy.login()
            cy.mockTiles()
            cy.clearLocalStorage()
        })

        it('should restore base layer, overlays and map view from URL context parameter', () => {
            // First, visit the page normally to discover available layers
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            // Wait for layers to be available
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            // Collect layer names: second base layer and first overlay
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).parent().then($label => {
                const secondBaseLayerName = $label.text().trim()

                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first().parent().then($overlayLabel => {
                    const firstOverlayName = $overlayLabel.text().trim()

                    cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().parent().then($overlayLabel => {
                        const lastAdditionalLayer = $overlayLabel.text().trim()

                        // Build a context object with second base layer, first overlay, and a specific map view
                        const urlContext = {
                            mapview: {lat: 45.0, lng: 3.0, zoom: 10},
                            maplayers: [secondBaseLayerName, firstOverlayName, lastAdditionalLayer]
                        }

                        const contextParam = encodeURIComponent(JSON.stringify(urlContext))

                        // Visit with context in URL
                        cy.visit(`/dummymodel/list/?context=${contextParam}`)
                        waitForMapReady()

                        openLayerSwitcher()

                        // Wait for layers
                        cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                            .should('have.length.greaterThan', 1)
                        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                            .should('have.length.greaterThan', 1)

                        // The second base layer should be selected (not the first)
                        cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
                        cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

                        // The first overlay should be checked (restored from URL context)
                        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                            .should('be.checked')
                        cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last()
                            .should('be.checked')
                    })
                })
            })
        })

        it('should persist URL context into localStorage and restore on subsequent reload', () => {
            // First, visit the page normally to discover available layers
            cy.visit('/dummymodel/list/')
            waitForMapReady()

            openLayerSwitcher()

            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // Collect second base layer name and first overlay name
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).parent().then($label => {
                const secondBaseLayerName = $label.text().trim()

                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first().parent().then($overlayLabel => {
                    const firstOverlayName = $overlayLabel.text().trim()

                    const urlContext = {
                        mapview: { lat: 45.0, lng: 3.0, zoom: 10 },
                        maplayers: [secondBaseLayerName, firstOverlayName]
                    }

                    const contextParam = encodeURIComponent(JSON.stringify(urlContext))

                    // Visit with context in URL
                    cy.visit(`/dummymodel/list/?context=${contextParam}`)
                    waitForMapReady()

                    // Wait for context to be saved to localStorage with the correct base layer
                    cy.window({timeout: 10000}).should((win) => {
                        const keys = Object.keys(win.localStorage)
                        const contextKey = keys.find(k => k.includes('map-context'))
                        expect(contextKey, 'localStorage map-context key').to.exist
                        const stored = JSON.parse(win.localStorage.getItem(contextKey))
                        expect(stored.maplayers, 'stored maplayers').to.exist
                        expect(stored.maplayers).to.include(secondBaseLayerName)
                    })

                    // Reload WITHOUT URL context — should restore from localStorage
                    cy.visit('/dummymodel/list/')
                    waitForMapReady()

                    openLayerSwitcher()

                    cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)

                    // The second base layer should still be selected (persisted from URL context)
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

                    // The first overlay should still be checked (persisted from URL context)
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                        .should('be.checked')
                })
            })
        })
    })

    describe('List view', () => {
        beforeEach(() => {
            cy.clearLocalStorage()
            cy.intercept('/mapbox/mapbox-baselayers/').as('baselayers')
            cy.login()
            cy.mockTiles()
            cy.clearLocalStorage()
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
            cy.visit('/mushroomspot/list/')
            waitForMapReady()
            openLayerSwitcher()

            // Wait for base layers and overlays to be fully loaded before interacting
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 0)

            // First base layer should be checked initially
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('not.be.checked')

            // Switch to second base layer
            // wait for layer present
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

            // Reload the page
            cy.reload()

            waitForMapReady()
            openLayerSwitcher()

            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the second base layer should still be selected (not the first)
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked', )
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

            // Wait for context to be saved to localStorage
            cy.window({timeout: 10000}).should((win) => {
                const keys = Object.keys(win.localStorage)
                const contextKey = keys.find(k => k.includes('context'))
                expect(contextKey, 'localStorage context key').to.exist
            })

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
            cy.clearLocalStorage()
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

            // The "Overlays" category checkbox (e.g. cadastre) should NOT be checked by default
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

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

            // switch third additional layer if exists
            cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().check({force: true})
            cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().should('be.checked')

            // Wait for context to be saved to localStorage
            cy.window({timeout: 10000}).should((win) => {
                const keys = Object.keys(win.localStorage)
                const contextKey = keys.find(k => k.includes('context'))
                expect(contextKey, 'localStorage context key').to.exist
            })

            // Reload the page
            cy.reload()
            waitForMapReady()

            openLayerSwitcher()

            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // After reload, the second base layer should still be selected (not the first)
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
            cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().should('be.checked')
        })

        it('should restore the activated overlays after page reload', () => {
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

            // Wait for context to be saved to localStorage
            cy.window({timeout: 10000}).should((win) => {
                const keys = Object.keys(win.localStorage)
                const contextKey = keys.find(k => k.includes('context'))
                expect(contextKey, 'localStorage context key').to.exist
            })

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
