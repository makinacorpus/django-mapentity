describe('DummyModel Filter and Search', () => {

  // --- Runs before each test ---
  beforeEach(() => {
    cy.login();
    cy.mockTiles();
    cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables*bbox=*').as('dummymodelsRequest');
    cy.visit('/dummymodel/list/');
    cy.wait('@dummymodelsRequest');
  });

  // --- Check that search input exists ---
  it('should display the search input', () => {
    cy.get('body', { timeout: 10000 }).should('exist');
    cy.get('#object-list-search').should('exist');
  });

  // --- Search filter ---
  it('should filter results when searching', { retries: 1 }, () => {
    cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables*search%5Bvalue%5D=test*').as('testSearchRequest');

    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        // Type search query
        cy.get('#object-list-search').first().clear().type('test', { delay: 0 });

        // Wait for the specific search request to finish
        cy.wait('@testSearchRequest');

        // Check updated row count
        cy.get('table tbody tr').should('not.have.length', initialRowCount);
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
        cy.get('#id_name').first().type('test', { delay: 0 });

        // Apply filter
        cy.get('#filter').click();

        // Wait for table update
        cy.wait('@dummymodelsRequest');

        // Check row count
        cy.get('table tbody tr').should('not.have.length', initialRowCount);
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
        cy.get('#id_tags').select(['Tag 1'], { force: true });

        cy.get('#filter').click();
        cy.wait('@dummymodelsRequest');

        cy.get('table tbody tr').should('not.have.length', initialRowCount);
      });
  });

  // --- Filter by Select2 AJAX search ---
  it('should filter results using a Select2 AJAX filter', { retries: 1 }, () => {
    cy.intercept('GET', '**/api/complexmodel/drf/complexmodels.datatables*bbox=*').as('complexmodelsRequest');
    cy.visit('/complexmodel/list/');
    cy.wait('@complexmodelsRequest');

    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('table tbody tr')
      .its('length')
      .then((initialRowCount) => {
        cy.log(`Initial row count: ${initialRowCount}`);

        cy.get('#filters-btn').click();
        cy.get('#mainfilter').should('be.visible');

        // Open Select2 AJAX dropdown
        cy.get('#id_road').parent().find('.select2').click()
        cy.get('#id_road').parent().find('.select2-search__field').first().type('Road 0', { delay: 0 })

        // Select the AJAX-loaded result
        cy.contains('.select2-results__option', 'Road 0').should('be.visible').click();

        cy.get('#filter').click();
        cy.wait('@complexmodelsRequest');

        cy.get('table tbody tr').should('not.have.length', initialRowCount);
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

        cy.get('#id_name').first().type('test', { delay: 0 });

        // Reset filters
        cy.get('#reset').click();

        cy.get('#id_name').should('have.value', '');
        cy.wait('@dummymodelsRequest');

        cy.get('table tbody tr').should('have.length.at.least', initialRowCount);
      });
  });

  // --- Persist filters in URL ---
  it('should persist filters in URL parameters', { retries: 1 }, () => {
    cy.intercept('GET', '**/api/dummymodel/drf/dummymodels.datatables*search%5Bvalue%5D=test*').as('searchRequest');

    cy.get('table tbody tr').should('have.length.greaterThan', 1);

    cy.get('#object-list-search').clear().type('test', { delay: 0 });

    cy.wait('@searchRequest');

    cy.get('@searchRequest').then((interception) => {
      const url = interception.request.url;
      cy.log(url);
      expect(url).to.include('search%5Bvalue%5D=test');
    });
  });

});