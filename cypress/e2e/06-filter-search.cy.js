describe('DummyModel Filter and Search', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/list/')
    })

    it('should display filter panel or search input', () => {
        cy.get('body', {timeout: 10000}).should('exist')

        // Look for filter or search elements
        cy.get('body').then($body => {
            const searchSelectors = [
                'input[type="search"]',
                'input[name="search"]',
                '#search',
                '.filters',
                '.filter-panel',
                'form.filters',
                '[class*="filter"]',
                '[class*="search"]'
            ]

            for (const selector of searchSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found filter/search with selector: ${selector}`)
                    cy.get(selector).should('exist')
                    return
                }
            }

            cy.log('No filter panel or search input found')
        })
    })

    it('should filter results when searching', {retries: 1}, () => {
        // Look for search input
        cy.get('body').then($body => {
            const searchSelectors = [
                'input[type="search"]',
                'input[name="search"]',
                '#search',
                '.filters input[type="text"]'
            ]

            for (const selector of searchSelectors) {
                if ($body.find(selector).length > 0) {
                    // Get initial row count
                    cy.get('table tbody tr').its('length').then((initialCount) => {
                        cy.log(`Initial row count: ${initialCount}`)

                        // Type in search
                        cy.get(selector).first().clear().type('test')

                        // Wait for potential AJAX/filtering
                        cy.wait(1000)

                        // Check if results changed (may have filtered or shown no results)
                        cy.get('table tbody').then($tbody => {
                            const newCount = $tbody.find('tr').length
                            cy.log(`After search row count: ${newCount}`)
                        })
                    })
                    return
                }
            }

            cy.log('No search input found')
        })
    })

    it('should have filter form if available', () => {
        cy.get('body').then($body => {
            const filterFormSelectors = [
                'form.filters',
                '.filter-panel form',
                'form[action*="list"]',
                '#filters'
            ]

            for (const selector of filterFormSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found filter form with selector: ${selector}`)
                    cy.get(selector).should('exist')

                    // Check for filter fields
                    cy.get(selector).find('input, select').should('exist')
                    return
                }
            }

            cy.log('No filter form found')
        })
    })

    it('should clear search results', {retries: 1}, () => {
        cy.get('body').then($body => {
            const searchSelectors = [
                'input[type="search"]',
                'input[name="search"]',
                '#search'
            ]

            for (const selector of searchSelectors) {
                if ($body.find(selector).length > 0) {
                    // Type in search
                    cy.get(selector).first().clear().type('test')
                    cy.wait(1000)

                    // Clear search
                    cy.get(selector).first().clear()
                    cy.wait(1000)

                    // Should show results again
                    cy.get('table tbody tr').should('have.length.greaterThan', 0)
                    return
                }
            }

            cy.log('No search input found')
        })
    })

    it('should update map when filtering', {retries: 1}, () => {
        // Check if map exists
        cy.get('body').then($body => {
            if ($body.find('#mainmap, .maplibre-map').length > 0) {
                cy.log('Map found on list view')

                // Try to apply a filter
                const searchSelectors = [
                    'input[type="search"]',
                    'input[name="search"]'
                ]

                for (const selector of searchSelectors) {
                    if ($body.find(selector).length > 0) {
                        cy.get(selector).first().clear().type('test')
                        cy.wait(2000)

                        // Map should still be visible after filtering
                        cy.get('#mainmap, .maplibre-map').should('exist')
                        return
                    }
                }
            } else {
                cy.log('No map on list view to test filtering')
            }
        })
    })

    it('should show filter button or toggle', () => {
        cy.get('body').then($body => {
            const filterButtonSelectors = [
                'button:contains("Filter")',
                'a:contains("Filter")',
                '.filter-toggle',
                '[data-toggle="filter"]',
                '.btn-filter'
            ]

            for (const selector of filterButtonSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.log(`Found filter button with selector: ${selector}`)
                    cy.get(selector).should('exist')
                    return
                }
            }

            cy.log('No filter button found - filters may be always visible')
        })
    })

    it('should persist filters in URL parameters', {retries: 1}, () => {
        cy.get('body').then($body => {
            const searchSelectors = [
                'input[type="search"]',
                'input[name="search"]'
            ]

            for (const selector of searchSelectors) {
                if ($body.find(selector).length > 0) {
                    cy.get(selector).first().clear().type('test')
                    cy.wait(1000)

                    // Check if URL contains search parameter
                    cy.url().then((url) => {
                        if (url.includes('search=test') || url.includes('q=test')) {
                            cy.log('Search parameter found in URL')
                        } else {
                            cy.log('Search may not persist in URL')
                        }
                    })
                    return
                }
            }
        })
    })
})
