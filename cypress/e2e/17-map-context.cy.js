describe('Map Context - Base layer, overlays and current object layer', () => {

    function openLayerSwitcher() {
        cy.get('.layer-switcher-btn', {timeout: 10000}).click()
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')
    }

    function waitForMapReady() {
        cy.get('#mainmap, #detailmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
    }

    function waitForContextRestored() {
        cy.window({timeout: 15000}).should((win) => {
            expect(win.MapEntity?.currentMap?.map?.getMap(), 'currentMap').to.exist
            expect(win.MapEntity?.currentMap?.context?.layerManager?.restoredContext, 'restoredContext').to.exist
        })
    }

    function waitForLayerInContext(storageKey, layerName) {
        cy.window({timeout: 10000}).should((win) => {
            const raw = win.localStorage.getItem(storageKey)
            expect(raw, storageKey).to.exist
            const stored = JSON.parse(raw)
            expect(stored.maplayers, `${storageKey}.maplayers`).to.include(layerName)
        })
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
                        waitForContextRestored()

                        openLayerSwitcher()

                        // Wait for layers
                        cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                            .should('have.length.greaterThan', 1)
                        cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                            .should('have.length.greaterThan', 1)
                        cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]', {timeout: 10000})
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
                    waitForContextRestored()

                    // Wait context to be restored
                    cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

                    // Wait for context to be saved to localStorage with the correct layers
                    waitForLayerInContext('listmap-context', secondBaseLayerName)
                    waitForLayerInContext('listmap-context', firstOverlayName)

                    // Reload WITHOUT URL context — should restore from localStorage
                    cy.visit('/dummymodel/list/')
                    waitForMapReady()
                    waitForContextRestored()

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
            waitForContextRestored()
            openLayerSwitcher()

            // Wait for base layers and overlays to be fully loaded before interacting
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // First base layer should be checked initially
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('not.be.checked')

            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).parent().then($label => {
                const secondBaseLayerName = $label.text().trim()

                // Switch to second base layer
                cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
                cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

                // Wait for context to be saved to localStorage with the selected base layer
                waitForLayerInContext('listmap-context', secondBaseLayerName)

                // Reload the page
                cy.reload()

                waitForMapReady()
                waitForContextRestored()
                openLayerSwitcher()

                cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                    .should('have.length.greaterThan', 1)

                // After reload, the second base layer should still be selected (not the first)
                cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
                cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
            })
        })

        it('should restore the activated overlay after page reload', () => {
            cy.visit('/dummymodel/list/')
            waitForMapReady()
            waitForContextRestored()
            openLayerSwitcher()

            // Wait for overlays
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // The first overlay (Overlays category, e.g. cadastre) should not be checked initially
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first().parent().then($label => {
                const firstOverlayName = $label.text().trim()

                // Activate the first overlay
                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                    .check({force: true})
                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                    .should('be.checked')

                // Wait for context to be saved to localStorage with the activated overlay
                waitForLayerInContext('listmap-context', firstOverlayName)

                // Reload the page
                cy.visit('/dummymodel/list/')
                waitForMapReady()
                waitForContextRestored()

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

        it('should restore the activated filters after page reload', () => {
            cy.visit('/complexmodel/list/')
            waitForMapReady()
            waitForContextRestored()

            // Wait for the filters
            cy.get('table tbody tr').should('have.length.greaterThan', 1)

            // Activate filters
            cy.get('#filters-btn').click()
            cy.get('#mainfilter.filter-form-loaded').should('be.visible')

            cy.get('#id_name').first().type('geo point')

            cy.get('#id_road').parent().find('.select2').click()
            cy.get('#id_road').parent().find('.select2-search__field').first().type('Road 0')
            cy.contains('.select2-results__option', 'Road 0').should('be.visible').click()

            cy.get('#id_located_in').select(['City 1', 'City 3'], { force: true })

            cy.get('#filter').click()

            // Wait for context to be saved to localStorage with the applied filter
            cy.window({timeout: 10000}).should((win) => {
                const raw = win.localStorage.getItem('listmap-context')
                expect(raw, 'listmap-context').to.exist
                const stored = JSON.parse(raw)
                expect(stored.filter, 'stored.filter').to.include('geo+point')
            })

            // Reload the page
            cy.visit('/complexmodel/list/')
            waitForMapReady()
            waitForContextRestored()

            // Wait for the filters
            cy.get('table tbody tr').should('have.length.greaterThan', 1)

            // Open filters
            cy.get('#filters-btn').click()
            cy.get('#mainfilter.filter-form-loaded').should('be.visible')

            cy.get('#id_name').first().should('have.value', 'geo point')
            cy.get('#id_road').parent().find('.select2-selection__choice').should('contain.text', 'Road')
            cy.get('#id_located_in').invoke('val').should('deep.equal', ['2', '4'])
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
            waitForContextRestored()

            openLayerSwitcher()

            // Wait for base layers and overlays
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 0)

            // First base layer should be checked initially
            cy.get('.layer-switcher-menu input[type="radio"]').first().should('be.checked')
            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('not.be.checked')

            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).parent().then($baseLabel => {
                const secondBaseLayerName = $baseLabel.text().trim()

                cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().parent().then($lazyLabel => {
                    const lastLazyLayerName = $lazyLabel.text().trim()

                    // Switch to second base layer
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')

                    // switch third additional layer if exists
                    cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().check({force: true})
                    cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().should('be.checked')

                    // Wait for context to be saved to localStorage with both layers
                    waitForLayerInContext('detailmap-context', secondBaseLayerName)
                    waitForLayerInContext('detailmap-context', lastLazyLayerName)

                    // Reload the page
                    cy.reload()
                    waitForMapReady()
                    waitForContextRestored()

                    openLayerSwitcher()

                    cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]', {timeout: 10000})
                        .should('have.length.greaterThan', 0)

                    // After reload, the second base layer should still be selected (not the first)
                    cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
                    cy.get('.layer-switcher-menu label[data-overlay-type="lazy"] input[type="checkbox"]').last().should('be.checked')
                })
            })
        })

        it('should restore the activated overlays after page reload', () => {
            cy.visit(`/dummymodel/${entityId}/`)
            waitForMapReady()
            waitForContextRestored()

            openLayerSwitcher()

            // Wait for overlays
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            // The first overlay should not be checked by default
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                .should('not.be.checked')

            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first().parent().then($label => {
                const firstOverlayName = $label.text().trim()

                // Activate the first overlay
                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                    .check({force: true})
                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                    .should('be.checked')

                // Wait for context to be saved to localStorage with the activated overlay
                waitForLayerInContext('detailmap-context', firstOverlayName)

                // Reload the page
                cy.visit(`/dummymodel/${entityId}/`)
                waitForMapReady()
                waitForContextRestored()

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

    describe('Form view (Add)', () => {
        beforeEach(() => {
            cy.login()
            cy.mockTiles()
            cy.clearLocalStorage()
        })

        it('should restore the list map position and layers on the add form', () => {
            const targetLng = 3.0
            const targetLat = 45.0
            const targetZoom = 12

            cy.visit('/dummymodel/list/')
            waitForMapReady()
            waitForContextRestored()

            openLayerSwitcher()

            // Wait for layers and switch base layer + overlay
            cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)
            cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                .should('have.length.greaterThan', 1)

            cy.get('.layer-switcher-menu input[type="radio"]').eq(1).parent().then($baseLabel => {
                const secondBaseLayerName = $baseLabel.text().trim()

                cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first().parent().then($overlayLabel => {
                    const firstOverlayName = $overlayLabel.text().trim()

                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).check({force: true})
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                        .check({force: true})

                    cy.window().then((win) => {
                        const map = win.MapEntity.currentMap.map.getMap()
                        map.jumpTo({center: [targetLng, targetLat], zoom: targetZoom})
                    })

                    // Wait for listmap-context to be saved with the new mapview and layers
                    cy.window({timeout: 10000}).should((win) => {
                        const stored = JSON.parse(win.localStorage.getItem('listmap-context'))
                        expect(stored, 'listmap-context').to.exist
                        expect(stored.mapview.lng).to.be.closeTo(targetLng, 0.01)
                        expect(stored.mapview.lat).to.be.closeTo(targetLat, 0.01)
                        expect(stored.mapview.zoom).to.be.closeTo(targetZoom, 0.1)
                        expect(stored.maplayers).to.include(secondBaseLayerName)
                        expect(stored.maplayers).to.include(firstOverlayName)
                    })

                    // Click on the Add button from the list view
                    cy.get('a.btn-success[href*="/add/"]').click()
                    cy.url().should('include', '/dummymodel/add/')
                    waitForMapReady()

                    // Wait for the widget map to restore the list position
                    cy.window({timeout: 10000}).should((win) => {
                        expect(win.mapentity_map, 'widget map').to.exist
                        const center = win.mapentity_map.getCenter()
                        const zoom = win.mapentity_map.getZoom()
                        expect(center.lng).to.be.closeTo(targetLng, 0.01)
                        expect(center.lat).to.be.closeTo(targetLat, 0.01)
                        expect(zoom).to.be.closeTo(targetZoom, 0.1)
                    })

                    // Verify base layer and overlay from list are also restored
                    openLayerSwitcher()
                    cy.get('.layer-switcher-menu input[type="radio"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]', {timeout: 10000})
                        .should('have.length.greaterThan', 1)
                    cy.get('.layer-switcher-menu input[type="radio"]').first().should('not.be.checked')
                    cy.get('.layer-switcher-menu input[type="radio"]').eq(1).should('be.checked')
                    cy.get('.layer-switcher-menu label[data-overlay-type="loaded"] input[type="checkbox"]').first()
                        .should('be.checked')
                })
            })
        })
    })
})
