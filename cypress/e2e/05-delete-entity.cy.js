describe('DummyModel Delete', () => {
    let entitiesToDelete = []

    beforeEach(() => {
        cy.login()
        cy.mockTiles()
    })

    it('should delete a single entity', () => {
        // Go to list view
        cy.visit('/dummymodel/list/')
        cy.get('table', {timeout: 10000}).should('exist')

        // Count total entities
        cy.get('table tbody tr').then($rows => {
            const totalCount = $rows.length
            cy.log(`Total entities before delete: ${totalCount}`)

            // Only delete if we have more than 5 entities to ensure some remain for other tests
            if (totalCount > 5) {
                // Get the first entity ID from the list
                cy.get('table tbody tr').first().find('a').first().invoke('attr', 'href').then((href) => {
                    const entityId = href.match(/\/dummymodel\/(\d+)\//)[1]

                    // Visit delete page
                    cy.visit(`/dummymodel/delete/${entityId}/`)

                    // Confirm delete
                    cy.get('form[method="post"]', {timeout: 10000}).should('exist')
                    cy.get('button[type="submit"], input[type="submit"]').contains(/delete|confirm/i).click()

                    // Should redirect back to list
                    cy.url({timeout: 10000}).should('include', '/dummymodel/list')
                })
            } else {
                cy.log('Skipping delete - not enough entities remaining')
            }
        })
    })

    it('should delete multiple entities via list actions', () => {
        // Go to list view
        cy.visit('/dummymodel/list/')
        cy.get('table', {timeout: 10000}).should('exist')

        // Count total entities
        cy.get('table tbody tr').then($rows => {
            const totalCount = $rows.length
            cy.log(`Total entities before bulk delete: ${totalCount}`)

            // Only delete if we have more than 10 entities to ensure some remain
            if (totalCount > 10) {
                cy.get(".dt-select-checkbox").first().click();
                cy.get("#btn-batch-editing").first().click();
                cy.get("#btn-delete").first().click();

                cy.get('form').get('input[type=submit]').click({force: true})
            } else {
                cy.log('Skipping bulk delete - not enough entities remaining')
            }
        })
    })
})
