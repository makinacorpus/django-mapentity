describe('DummyModel Filter and Search', () => {

  // --- Runs before each test ---
  beforeEach(() => {
    cy.login();
    cy.mockTiles();
    cy.visit('/dummymodel/list/');
  });

  // --- Check that search input exists ---
  it('should display the search input', () => {
    cy.get('body', { timeout: 10000 }).should('exist');
    cy.get('#object-list-search').should('exist');
  });

  // --- Search filter ---
  it('should filter results when searching', { retries: 1 }, () => {
    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        // Type search query
        cy.get('#object-list-search').first().clear().type('test');

        // Wait for processing to finish
        cy.get('#objects-list_processing', { timeout: 10000 }).should('not.be.visible');

        // Check updated row count
        cy.get('table tbody tr')
          .its('length')
          .then((newRowCount) => {
            cy.log(`Row count after search: ${newRowCount}`);
            expect(newRowCount, 'row count should change after searching').to.not.equal(initialRowCount);
          });
      });
  });

  // --- Filter panel visibility ---
  it('should display the filter panel', () => {
    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('#filters-btn').click();
    cy.get('#mainfilter').should('be.visible');
  });

  // --- Filter by text input ---
  it('should filter results using the name input', { retries: 1 }, () => {
    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        // Open filters
        cy.get('#filters-btn').click();
        cy.get('#mainfilter').should('be.visible');

        // Type into name filter
        cy.get('#id_name').first().type('test');

        // Apply filter
        cy.get('#filter').click();

        // Wait for table update
        cy.get('#objects-list_processing', { timeout: 10000 }).should('not.be.visible');

        // Check row count
        cy.get('table tbody tr')
          .its('length')
          .then((newRowCount) => {
            cy.log(`Row count after filtering: ${newRowCount}`);
            expect(newRowCount, 'row count should change after applying filter').to.not.equal(initialRowCount);
          });
      });
  });

  // --- Filter by Select2 simple multi-select ---
  it('should filter results using a Select2 filter', { retries: 1 }, () => {
    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        cy.get('#filters-btn').click();
        cy.get('#mainfilter').should('be.visible');

        // Select multiple tags
        cy.get('#id_tags').select(['Tag 1', 'Tag 3'], { force: true });

        cy.get('#filter').click();
        cy.get('#objects-list_processing', { timeout: 10000 }).should('not.be.visible');

        cy.get('table tbody tr')
          .its('length')
          .then((newRowCount) => {
            cy.log(`Row count after Select2 filtering: ${newRowCount}`);
            expect(newRowCount, 'row count should change after applying Select2 filter').to.not.equal(initialRowCount);
          });
      });
  });

  // --- Filter by Select2 AJAX search ---
  it('should filter results using a Select2 AJAX filter', { retries: 1 }, () => {
    cy.visit('/complexmodel/list/');

    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        cy.get('#filters-btn').click();
        cy.get('#mainfilter').should('be.visible');

        // Open Select2 AJAX dropdown
        cy.get('#id_road').parent().find('.select2').click()
        cy.get('[data-select2-id="38"] .select2-selection--multiple').first().type('Road 17')

        // Select the AJAX-loaded result
        cy.contains('.select2-results__option', 'Road 17').should('be.visible').click();

        cy.get('#filter').click();
        cy.get('#objects-list_processing', { timeout: 10000 }).should('not.be.visible');

        cy.get('table tbody tr')
          .its('length')
          .then((newRowCount) => {
            cy.log(`Row count after Select2 AJAX filtering: ${newRowCount}`);
            expect(newRowCount, 'row count should change after applying AJAX filter').to.not.equal(initialRowCount);
          });
      });
  });

  // --- Reset filters ---
  it('should clear search results when resetting filters', { retries: 1 }, () => {
    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        cy.get('#filters-btn').click();
        cy.get('#mainfilter').should('be.visible');

        cy.get('#id_name').first().type('test');

        // Reset filters
        cy.get('#reset').click();

        cy.get('#id_name').should('have.value', '');
        cy.get('#objects-list_processing', { timeout: 10000 }).should('not.be.visible');

        cy.get('table tbody tr')
          .its('length')
          .then((newRowCount) => {
            cy.log(`Row count after reset: ${newRowCount}`);
            expect(newRowCount, 'row count should reset after clearing filters').to.be.at.least(initialRowCount);
          });
      });
  });

  // --- Persist filters in URL ---
  it('should persist filters in URL parameters', { retries: 1 }, () => {
    cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables?*').as('searchRequest');

    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('#object-list-search').clear().type('test');

    cy.wait('@searchRequest');

    cy.get('@searchRequest').then((interception) => {
      const url = interception.request.url;
      cy.log(url);
      expect(url).to.include('search%5Bvalue%5D=test');
    });
  });

});