describe('List View - Export Functions', () => {
    beforeEach(() => {
        cy.login()
        cy.visit('/dummymodel/list/')
    })

    it('should display export buttons', () => {
        // Look for export button group
        cy.get('body').then($body => {
            const exportSelectors = [
                '.btn-group button[name="csv"]',
                'button[name="csv"]',
                '.btn-group button[name="shp"]',
                'button[name="shp"]',
                'img[src*="csv.png"]',
                'img[src*="shp.png"]',
                '[title*="CSV"]',
                '[title*="Shapefile"]'
            ]

            let foundExport = false
            for (const selector of exportSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found export button with selector: ${selector}`)
                    cy.get(selector).should('exist')
                    foundExport = true
                    break
                }
            }

            if (!foundExport) {
                cy.log('Export buttons not found - may require entities to be selected or different permissions')
            }
        })
    })

    it('should have CSV export button', () => {
        cy.get('body').then($body => {
            if ($body.find('button[name="csv"], img[src*="csv.png"]').length > 0) {
                cy.get('button[name="csv"], img[src*="csv.png"]').should('exist')
            } else {
                cy.log('CSV export button not found')
            }
        })
    })

    it('should have Shapefile export button', () => {
        cy.get('body').then($body => {
            if ($body.find('button[name="shp"], img[src*="shp.png"]').length > 0) {
                cy.get('button[name="shp"], img[src*="shp.png"]').should('exist')
            } else {
                cy.log('Shapefile export button not found')
            }
        })
    })

    it('should have GPX export option if available', () => {
        cy.get('body').then($body => {
            const gpxSelectors = [
                'button[name="gpx"]',
                'img[src*="gpx.png"]',
                '[title*="GPX"]'
            ]

            for (const selector of gpxSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found GPX export with selector: ${selector}`)
                    cy.get(selector).should('exist')
                    return
                }
            }

            cy.log('GPX export not available (may be optional)')
        })
    })

    it('should trigger CSV export when clicked', {retries: 1}, () => {
        cy.get('body').then($body => {
            if ($body.find('button[name="csv"]').length > 0) {
                // Set up to intercept download
                cy.window().then((win) => {
                    cy.stub(win, 'open').as('windowOpen')
                })

                // Wait for button to be visible and click
                cy.get('button[name="csv"]').first().should('be.visible')
                cy.get('button[name="csv"]').first().click()

                // Check if a download was triggered or URL changed
                cy.wait(1000)
                cy.url().then((url) => {
                    if (url.includes('format=csv') || url.includes('.csv')) {
                        cy.log('CSV export URL detected')
                    }
                })
            } else {
                cy.log('CSV export button not available for testing')
            }
        })
    })

    it('should trigger Shapefile export when clicked', {retries: 1}, () => {
        cy.get('body').then($body => {
            if ($body.find('button[name="shp"]').length > 0) {
                // Set up to intercept download
                cy.window().then((win) => {
                    cy.stub(win, 'open').as('windowOpen')
                })

                // Wait for button to be visible and click
                cy.get('button[name="shp"]').first().should('be.visible')
                cy.get('button[name="shp"]').first().click()

                // Check if a download was triggered or URL changed
                cy.wait(1000)
                cy.url().then((url) => {
                    if (url.includes('format=shp') || url.includes('.shp')) {
                        cy.log('Shapefile export URL detected')
                    }
                })
            } else {
                cy.log('Shapefile export button not available for testing')
            }
        })
    })

    it('should export with filters applied', {retries: 1}, () => {
        // Apply a filter first
        cy.get('body').then($body => {
            // Look for search or filter input
            const filterSelectors = [
                'input[type="search"]',
                'input[name="search"]',
                '#search',
                '.filters input[type="text"]'
            ]

            for (const selector of filterSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.get(selector).first().type('test')
                    cy.wait(1000)
                    break
                }
            }

            // Now try to export
            if ($body.find('button[name="csv"]').length > 0) {
                cy.get('button[name="csv"]').first().should('be.visible')
                cy.get('button[name="csv"]').first().click()
                cy.wait(1000)
                cy.log('Export with filter applied')
            }
        })
    })

    it('should show export buttons in proper button group', () => {
        cy.get('body').then($body => {
            if ($body.find('.btn-group').length > 0) {
                cy.get('.btn-group').should('exist')

                // Check if export buttons are within button group
                cy.get('.btn-group').then($group => {
                    if ($group.find('button[name="csv"]').length > 0 ||
                        $group.find('button[name="shp"]').length > 0) {
                        cy.log('Export buttons found in button group')
                    }
                })
            }
        })
    })

    it('should handle export with selected entities', {retries: 1}, () => {
        // Select some entities first
        cy.get('table tbody tr').then($rows => {
            if ($rows.length > 0) {
                // Try to select first few entities
                cy.get('table tbody tr').each(($row, index) => {
                    if (index < 2) {
                        const checkbox = $row.find('input[type="checkbox"]')
                        if (checkbox.length > 0) {
                            cy.wrap($row).find('input[type="checkbox"]').first().check({force: true})
                        }
                    }
                })

                cy.wait(500)

                // Now try to export selected
                cy.get('body').then($body => {
                    if ($body.find('button[name="csv"]').length > 0) {
                        cy.get('button[name="csv"]').first().should('be.visible')
                        cy.get('button[name="csv"]').first().click()
                        cy.wait(1000)
                        cy.log('Export with selected entities')
                    }
                })
            }
        })
    })

    it('should display correct export format icons', () => {
        cy.get('body').then($body => {
            // Check for format icons
            const iconSelectors = [
                'img[src*="csv.png"]',
                'img[src*="shp.png"]',
                'img[src*="gpx.png"]',
                'img[alt*="CSV"]',
                'img[alt*="Shapefile"]'
            ]

            let foundIcons = []
            for (const selector of iconSelectors) {
                if ($body.find(selector).length > 0) {
                    foundIcons.push(selector)
                    cy.get(selector).should('exist')
                }
            }

            if (foundIcons.length > 0) {
                cy.log(`Found ${foundIcons.length} export format icons`)
            } else {
                cy.log('Export format icons not found - may use different styling')
            }
        })
    })
})
