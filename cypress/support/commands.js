// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Login command for authenticated tests
Cypress.Commands.add('login', (username = 'admin', password = 'admin') => {
  cy.session([username, password], () => {
    cy.visit('/login/')
    cy.get('input[name="username"]').type(username)
    cy.get('input[name="password"]').type(password)
    cy.get('form').submit()
    cy.url().should('not.include', '/login/')
  })
});

Cypress.Commands.add('mockTiles', () => {
    cy.intercept("https://*.openstreetmap.org/*/*/*.png", {fixture: "images/tile_osm.png"}).as("tiles_osm");
    cy.intercept("https://*.tile.opentopomap.org/*/*/*.png", {fixture: "images/tile_otm.png"}).as("tiles_otm");
    cy.intercept(/data\.geopf\.fr\/wmts\?LAYER=CADASTRALPARCELS/, {fixture: "images/tile_overlay.png"}).as("tiles_overlay");
});

// Command to wait for map to be ready (MapLibre instead of Leaflet)
Cypress.Commands.add('waitForMap', () => {
  // Check for various map container selectors (more flexible)
  cy.get('.maplibre-map, #mainmap, .map-panel', { timeout: 10000 }).should('be.visible')
})

// Command to open user dropdown menu
Cypress.Commands.add('openUserMenu', (selector) => {
  cy.get('body').then($body => {

    cy.get('#navbarDropdownUsermenuLink').first().click()
  })
})

// Command to wait for dropdown menu to be visible
Cypress.Commands.add('waitForDropdownMenu', () => {
  // Wait for dropdown menu content to be visible
  cy.get('.dropdown-menu.show, .dropdown.show .dropdown-menu', { timeout: 5000 }).should('be.visible')
})

// Command to find and click element using multiple selectors
Cypress.Commands.add('findAndClick', (selectors, options = {}) => {
  cy.get('body').then($body => {
    for (const selector of selectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Found element with selector: ${selector}`)
        // Wait for element to be visible before clicking (unless force is explicitly set)
        if (!options.force) {
          cy.get(selector).first().should('be.visible')
        }
        cy.get(selector).first().click(options)
        return
      }
    }
    cy.log(`No element found with any of the provided selectors`)
  })
})

// Command to check if element exists using multiple selectors
Cypress.Commands.add('findElement', (selectors, options = {}) => {
  cy.get('body').then($body => {
    for (const selector of selectors) {
      if ($body.find(selector).length > 0) {
        cy.log(`Found element with selector: ${selector}`)
        return cy.get(selector).first()
      }
    }
    cy.log(`No element found with any of the provided selectors`)
    return cy.wrap(null)
  })
})

Cypress.Commands.add('setTinyMceContent', (tinyMceId, content) => {
  cy.window().then((win) => {
    const editor = win.tinymce.get(tinyMceId);
    if (editor) {
      editor.setContent(content);
    }
  });
});

Cypress.Commands.add('getTinyMceContent', (tinyMceId, content) => {
  cy.window().then((win) => {
    const editor = win.tinymce.get(tinyMceId);
    if (editor) {
      return editor.getContent();
    }
    return '';
  });
});

// Command to assert Geoman features count with retry capability
Cypress.Commands.add('assertGeomanFeaturesCount', (expectedCount, options = {}) => {
  const timeout = options.timeout || 10000;
  cy.window({timeout}).should((win) => {
    // verify Geoman is loaded before accessing logic
    expect(win.gm, 'window.gm').to.exist;
    expect(win.gm.features, 'gm.features').to.exist;

    // execute logic and assertion (will be retried if fails)
    const featureCount = win.gm.features.exportGeoJsonFromSource("gm_main").features.length;
    expect(featureCount).to.equal(expectedCount);
  });
});

// Command to assert geometry field value with retry capability
// This ensures the geometry is properly set before making assertions
Cypress.Commands.add('assertGeomFieldValue', (assertions, options = {}) => {
  const timeout = options.timeout || 10000;
  cy.get('#id_geom', {timeout}).should(($el) => {
    const val = $el.val();
    expect(val, 'id_geom value').to.not.be.empty;
    
    // Parse the value and run assertions
    const data = JSON.parse(val);
    assertions(data, val);
  });
});

// Command to wait for Geoman to be fully initialized
Cypress.Commands.add('waitForGeoman', (options = {}) => {
  const timeout = options.timeout || 10000;
  cy.window({timeout}).should((win) => {
    expect(win.gm, 'window.gm').to.exist;
    expect(win.gm.features, 'gm.features').to.exist;
  });
});
// Command to wait for map data (GeoJSON layers) to be loaded on list views
Cypress.Commands.add('waitForMapData', (options = {}) => {
  const timeout = options.timeout || 15000;
  // Wait for the table data to be present (indicates data is loaded)
  cy.get('table tbody tr', {timeout}).should('have.length.greaterThan', 0);
  // Wait for MapEntity map to be initialized with layers
  cy.window({timeout}).should((win) => {
    expect(win.MapEntity, 'window.MapEntity').to.exist;
    expect(win.MapEntity.currentMap, 'MapEntity.currentMap').to.exist;
  });
});
// Command to search for an entity in the DataTable and wait for it to appear
Cypress.Commands.add('searchInTable', (name, options = {}) => {
  const timeout = options.timeout || 15000;
  // Type in the DataTable search box to filter results
  cy.get('.dataTables_filter input, input[type="search"]', {timeout}).clear().type(name);
  // Wait for the table to update and contain the entity
  cy.get('table tbody', {timeout}).contains('tr', name, {timeout});
});

// Command to wait for map context to be saved to localStorage
Cypress.Commands.add('waitForContextSaved', (options = {}) => {
  const prefix = options.prefix || '';
  const timeout = options.timeout || 10000;
  cy.window({timeout}).should((win) => {
    const keys = Object.keys(win.localStorage);
    const contextKey = keys.find(k => k.includes('mapcontext') || k.includes('context'));
    expect(contextKey, 'localStorage context key').to.exist;
  });
});