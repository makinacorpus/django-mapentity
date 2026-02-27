describe('DummyModel Filter and Search', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.visit('/dummymodel/list/')
    })
    it('should display search input', () => {
        cy.get('body', {timeout: 10000}).should('exist')
        // Look for #object-list-search
        cy.get('#object-list-search').should('exist')
    })
    it('should filter results when searching', { retries: 1 }, () => {
        // Wait for the table to finish its initial loading
        cy.get('table tbody tr').should('have.length.greaterThan', 1)
        // Get the initial number of rows in the table
        cy.get('table tbody tr').its('length')
            .then((initialCount) => {
                cy.log(`Initial row count: ${initialCount}`)
                // Type a search query into the search input
                cy.get('#object-list-search').first().clear().type('test')
                // Wait for the table to finish processing the search results
                cy.get('#objects-list_processing', {timeout: 10000}).should('not.be.visible')
                // Get the updated number of rows after filtering
                cy.get('table tbody tr')
                    .its('length')
                    .then((newCount) => {
                        cy.log(`After search row count: ${newCount}`)
                        // Assert that the number of rows has changed after filtering
                        expect(newCount, 'row count should change after applying search filter'
                        ).to.not.equal(initialCount)
                    })
            })
    })
    it('should display filter panel', () => {
        cy.get('body', {timeout: 10000}).should('exist')
        // Open filters
        cy.get('table tbody tr').should('have.length.greaterThan', 1)
        cy.get('#filters-btn').click()
        // Check filters are visible
        cy.get('#mainfilter').should('be.visible')
    })
    it('should filter results when filtering', { retries: 1 }, () => {
        // Wait for the table to finish its initial loading (DataTables processing indicator)
        cy.get('table tbody tr').should('have.length.greaterThan', 1)
        // Get the initial number of rows in the table
        cy.get('table tbody tr').its('length')
            .then((initialCount) => {
                cy.log(`Initial row count: ${initialCount}`)
                // Open filters
                cy.get('#filters-btn').click()
                // Type a search query into the name input
                cy.get('#id_name').first().type('test')
                // Filter list
                cy.get('#filter').click()
                // Wait for the table to finish processing the search results
                cy.get('#objects-list_processing', {timeout: 10000}).should('not.be.visible')
                // Get the updated number of rows after filtering
                cy.get('table tbody tr')
                    .its('length')
                    .then((newCount) => {
                        cy.log(`After search row count: ${newCount}`)
                        // Assert that the number of rows has changed after filtering
                        expect(newCount, 'row count should change after applying search filter'
                        ).to.not.equal(initialCount)
                    })
            })
    })
    it('should clear search results', {retries: 1}, () => {
        // Wait for the table to finish its initial loading (DataTables processing indicator)
        cy.get('table tbody tr').should('have.length.greaterThan', 1)
        // Get the initial number of rows in the table
        cy.get('table tbody tr').its('length')
            .then((initialCount) => {
                cy.log(`Initial row count: ${initialCount}`)
                // Open filters
                cy.get('#objects-list_processing', {timeout: 10000}).should('not.be.visible')
                cy.get('#filters-btn').click()
                // Type a search query into the name input
                cy.get('#id_name').first().type('test')
                // Reset filters list
                cy.get('#reset').click()
                // Name filter should be empty
                cy.get('#id_name').should('have.value', '')
                // Wait for the table to finish processing the search results
                cy.get('#objects-list_processing', {timeout: 10000}).should('not.be.visible')
                // Get the updated number of rows after filtering
                cy.get('table tbody tr')
                    .its('length')
                    .then((newCount) => {
                        cy.log(`After search row count: ${newCount}`)
                        // Assert that the number of rows has changed after filtering
                        expect( newCount, 'row count should reset rows after filtering' ).to.be.at.least(initialCount)

                    })
            })
    })
    it('should persist filters in URL parameters', {retries: 1}, () => {
        cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables?*')
            .as('searchRequest')
        // Wait for the table to finish its initial loading (DataTables processing indicator)
        cy.get('table tbody tr').should('have.length.greaterThan', 1)
        // Filter list
        cy.get('#object-list-search').clear().type('test')
        cy.wait('@searchRequest')
        //Look for the request
        cy.get('@searchRequest').then((interception) => {
          const url = interception.request.url
            cy.log(url)
          expect(url).to.include('search%5Bvalue%5D=test')
        })
    })

})

