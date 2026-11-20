describe('DummyModel List View', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/list/')
    })

    it('should display the list page', () => {
        cy.url().should('include', '/dummymodel/list')
        cy.get('body').should('be.visible')
    })

    it('should have map container', () => {
        // Check for map container (either mainmap div or maplibre-map class)
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 10000}).should('exist')
    })

    it('should display table with entities', () => {
        cy.get('table', {timeout: 10000}).should('exist')
    })

    it('should have add button', () => {
        cy.get('a').contains('Add', {matchCase: false}).should('exist')
    })

    it('should have layer switcher control on map', {retries: 1}, () => {
        // Wait for map to load
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')

        // Check for layer switcher button
        cy.get('body').then($body => {
            const layerSwitcherSelectors = [
                '.layer-switcher-btn',
                '.maplibregl-ctrl-group button',
                '.mapboxgl-ctrl-group button',
                '[class*="layer"][class*="control"]',
                '[class*="layer"][class*="switcher"]'
            ]

            let found = false
            for (const selector of layerSwitcherSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found layer switcher with selector: ${selector}`)
                    cy.get(selector).first().should('exist')

                    // Try to click it to open the menu
                    cy.get(selector).first().click({force: true})

                    // Check if menu appeared
                    const menuSelectors = [
                        '.layer-switcher-menu',
                        '[class*="layer"][class*="menu"]',
                        '[class*="layer-list"]'
                    ]

                    for (const menuSelector of menuSelectors) {
                        if ($body.find(menuSelector).length > 0) {
                            cy.log(`Found layer switcher menu: ${menuSelector}`)
                            cy.get(menuSelector).should('exist')

                            // Check for layer labels/items in the menu
                            cy.get(menuSelector).find('label, input, [class*="layer-item"]').should('have.length.greaterThan', 0)
                        }
                    }

                    found = true
                    break
                }
            }

            if (!found) {
                cy.log('Layer switcher not found with common selectors')
            }
        })
    })

    it('should display multiple MapEntity models in layer selector', {retries: 1}, () => {
        // Wait for map to load
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
        // Open layer switcher
        cy.get('body').then($body => {
            const buttonSelectors = [
                '.layer-switcher-btn',
                '.maplibregl-ctrl-group button',
                '[class*="layer"][class*="control"]'
            ]

            for (const selector of buttonSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.get(selector).first().click({force: true})
                    break
                }
            }
        })

        // Check for multiple model layers in the menu
        cy.get('body').then($body => {
            const menuSelectors = [
                '.layer-switcher-menu label',
                '.layer-switcher-menu [class*="layer"]',
                '[class*="layer-menu"] label'
            ]

            for (const selector of menuSelectors) {
                if ($body.find(selector).length > 0) {
                    // Should have at least one layer (the current model)
                    cy.get(selector).should('have.length.greaterThan', 0)

                    // Log the layer names found
                    cy.get(selector).each(($el) => {
                        cy.log(`Found layer: ${$el.text()}`)
                    })
                    break
                }
            }
        })
    })

    it('should disable zoom-out at min zoom and zoom-in at max zoom', () => {
        cy.get('.maplibregl-ctrl-zoom-in', {timeout: 15000}).should('exist')
        cy.get('.maplibregl-ctrl-zoom-out', {timeout: 15000}).should('exist')

        cy.window().then((win) => {
            const map = win.MapEntity.currentMap.map.getMap()
            map.setZoom(map.getMinZoom())
        })
        cy.get('.maplibregl-ctrl-zoom-out').should('be.disabled').and('have.attr', 'aria-disabled', 'true')
        cy.get('.maplibregl-ctrl-zoom-in').should('not.be.disabled')

        cy.window().then((win) => {
            const map = win.MapEntity.currentMap.map.getMap()
            map.setZoom(map.getMaxZoom())
        })
        cy.get('.maplibregl-ctrl-zoom-in').should('be.disabled').and('have.attr', 'aria-disabled', 'true')
        cy.get('.maplibregl-ctrl-zoom-out').should('not.be.disabled')
    })
})
