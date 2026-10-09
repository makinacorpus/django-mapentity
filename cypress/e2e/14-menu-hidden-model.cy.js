describe('Menu Hidden Model (menu=False)', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
    })

    it('should not display HiddenModel in the sidebar menu', () => {
        cy.visit('/dummymodel/list/')
        cy.get('#entitylist', {timeout: 10000}).should('exist')

        // Verify that other models with menu=True are visible in the sidebar
        cy.get('#entitylist a[href*="/dummymodel/list"]').should('exist')

        // Verify that HiddenModel (menu=False) is NOT in the sidebar menu
        cy.get('#entitylist a[href*="/hiddenmodel/list"]').should('not.exist')
    })

    it('should not display HiddenModel in the layers list', () => {
        cy.visit('/dummymodel/list/')

        // Wait for map to load
        cy.get('#mainmap, .maplibre-map, .map-panel', {timeout: 15000}).should('exist')

        // Open layer switcher
        cy.get('.layer-switcher-btn', {timeout: 10000}).first().click({force: true})

        // Check that the layer menu is open
        cy.get('.layer-switcher-menu', {timeout: 5000}).should('be.visible')

        // Verify that HiddenModel is NOT in the layers list
        cy.get('.layer-switcher-menu').then($menu => {
            const menuText = $menu.text().toLowerCase()
            expect(menuText).to.not.include('hidden model')
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

    it('should still allow accessing HiddenModel list page directly', () => {
        // HiddenModel with menu=False should still have URLs registered
        // but should not appear in navigation menus
        // Note: The model is still accessible via URL, menu=False only hides it from menus
        cy.visit('/hiddenmodel/list/', {failOnStatusCode: false})

        // The page should load (menu=False doesn't block URL access, just hides from menu)
        cy.url().should('include', '/hiddenmodel/list')
    })

    it('should not include HiddenModel in JS settings layers', () => {
        cy.visit('/dummymodel/list/')

        // Check that window.SETTINGS.layers does not include hiddenmodel
        cy.window().then((win) => {
            if (win.SETTINGS && win.SETTINGS.layers) {
                const layerIds = win.SETTINGS.layers.map(l => l.id)
                expect(layerIds).to.not.include('hiddenmodel')

                // Verify other models are present
                const hasOtherModels = layerIds.includes('dummymodel') ||
                                       layerIds.includes('mushroomspot') ||
                                       layerIds.includes('road') ||
                                       layerIds.includes('city')
                expect(hasOtherModels).to.be.true
            }
        })
    })

    it('should have accessible GeoJSON endpoint for HiddenModel despite menu=False', () => {
        // menu=False only hides the model from navigation menus and layer switcher
        // The GeoJSON API endpoint should still be accessible for data retrieval
        cy.request({
            url: '/api/hiddenmodel/drf/hiddenmodels.geojson',
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

    it('should have accessible GeoJSON detail endpoint for HiddenModel', () => {
        // First, get a hiddenmodel ID from the list endpoint
        cy.request({
            url: '/api/hiddenmodel/drf/hiddenmodels.geojson',
            failOnStatusCode: false
        }).then((listResponse) => {
            expect(listResponse.status).to.eq(200)

            // If there are hiddenmodels, test the detail endpoint
            if (listResponse.body.features && listResponse.body.features.length > 0) {
                const hiddenmodelId = listResponse.body.features[0].id

                cy.request({
                    url: `/api/hiddenmodel/drf/hiddenmodels/${hiddenmodelId}.geojson`,
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
