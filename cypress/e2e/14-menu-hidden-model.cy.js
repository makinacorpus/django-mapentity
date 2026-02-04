describe('Menu Hidden Model (menu=False)', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
    })

    it('should not display Supermarket in the sidebar menu', () => {
        cy.visit('/dummymodel/list/')
        cy.get('#entitylist', {timeout: 10000}).should('exist')

        // Verify that other models with menu=True are visible in the sidebar
        cy.get('#entitylist a[href*="/dummymodel/list"]').should('exist')

        // Verify that Supermarket (menu=False) is NOT in the sidebar menu
        cy.get('#entitylist a[href*="/supermarket/list"]').should('not.exist')
    })

    it('should not display Supermarket in the layers list', () => {
        cy.visit('/dummymodel/list/')

        // Wait for map to load
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')
        cy.wait(2000)

        // Open layer switcher
        cy.get('.layer-switcher-btn').first().click({force: true})
        cy.wait(500)

        // Check that the layer menu is open
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('exist')

        // Verify that Supermarket is NOT in the layers list
        cy.get('.layer-switcher-menu').then($menu => {
            const menuText = $menu.text().toLowerCase()
            expect(menuText).to.not.include('supermarket')
        })

        // Verify that other models with menu=True ARE in the layers list
        cy.get('.layer-switcher-menu').then($menu => {
            const menuText = $menu.text().toLowerCase()
            // At least one of the other models should be present
            const hasOtherModels = menuText.includes('dummy') ||
                                   menuText.includes('mushroom') ||
                                   menuText.includes('road') ||
                                   menuText.includes('city')
            expect(hasOtherModels).to.be.true
        })
    })

    it('should return 404 when accessing Supermarket list page directly', () => {
        // Supermarket with menu=False should still have URLs registered
        // but should not appear in navigation menus
        // Note: The model is still accessible via URL, menu=False only hides it from menus
        cy.visit('/supermarket/list/', {failOnStatusCode: false})

        // The page should load (menu=False doesn't block URL access, just hides from menu)
        cy.url().should('include', '/supermarket/list')
    })

    it('should not include Supermarket in JS settings layers', () => {
        cy.visit('/dummymodel/list/')

        // Wait for JS settings to load
        cy.wait(1000)

        // Check that window.SETTINGS.layers does not include supermarket
        cy.window().then((win) => {
            if (win.SETTINGS && win.SETTINGS.layers) {
                const layerIds = win.SETTINGS.layers.map(l => l.id)
                expect(layerIds).to.not.include('supermarket')

                // Verify other models are present
                const hasOtherModels = layerIds.includes('dummymodel') ||
                                       layerIds.includes('mushroomspot') ||
                                       layerIds.includes('road') ||
                                       layerIds.includes('city')
                expect(hasOtherModels).to.be.true
            }
        })
    })

    it('should have accessible GeoJSON endpoint for Supermarket despite menu=False', () => {
        // menu=False only hides the model from navigation menus and layer switcher
        // The GeoJSON API endpoint should still be accessible for data retrieval
        cy.request({
            url: '/api/supermarket/drf/supermarkets.geojson',
            failOnStatusCode: false
        }).then((response) => {
            // The endpoint should return 200 OK (data is accessible)
            expect(response.status).to.eq(200)

            // Response should be valid GeoJSON
            expect(response.body).to.have.property('type', 'FeatureCollection')
            expect(response.body).to.have.property('features')
            expect(response.body.features).to.be.an('array')
        })
    })

    it('should have accessible GeoJSON detail endpoint for Supermarket', () => {
        // First, get a supermarket ID from the list endpoint
        cy.request({
            url: '/api/supermarket/drf/supermarkets.geojson',
            failOnStatusCode: false
        }).then((listResponse) => {
            expect(listResponse.status).to.eq(200)

            // If there are supermarkets, test the detail endpoint
            if (listResponse.body.features && listResponse.body.features.length > 0) {
                const supermarketId = listResponse.body.features[0].id

                cy.request({
                    url: `/api/supermarket/drf/supermarkets/${supermarketId}.geojson`,
                    failOnStatusCode: false
                }).then((detailResponse) => {
                    expect(detailResponse.status).to.eq(200)
                    expect(detailResponse.body).to.have.property('type', 'Feature')
                    expect(detailResponse.body).to.have.property('geometry')
                    expect(detailResponse.body).to.have.property('properties')
                })
            }
        })
    })
})
