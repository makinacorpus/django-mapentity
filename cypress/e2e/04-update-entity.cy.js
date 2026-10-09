describe('DummyModel Batch Update', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
        cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables*bbox=*').as('getDatatables')
    });

    it('should update multiple entities via list actions', () => {
        // Go to list view
        cy.visit('/dummymodel/list/')
        cy.wait('@getDatatables')
        cy.get('table tbody tr').should('have.length.greaterThan', 1)

        cy.get(".dt-select-checkbox").first().click();
        cy.get("#btn-batch-editing").first().click();
        cy.get("#btn-edit").first().click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.match(/\/dummymodel\/multi_update\//)
        })
        cy.get("select[name=public]").select('true', {force: true})

        cy.get('#submit-id-save').click({force: true})
        cy.get('#confirm-submit').click({force: true})
    })

});
