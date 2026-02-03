describe('DummyModel Batch Update', () => {
    beforeEach(() => {
        cy.login()
        cy.mockTiles()
    });

    it('should update multiple entities via list actions', () => {
        // Go to list view
        cy.visit('/dummymodel/list/')
        cy.get('table', {timeout: 10000}).should('exist')

        cy.get(".dt-select-checkbox").first().click();
        cy.get("#btn-batch-editing").first().click();
        cy.get("#btn-edit").first().click();

        cy.get("select[name=public]").select('true', {force: true})

        cy.get('#submit-id-save').click({force: true})

    })

});
