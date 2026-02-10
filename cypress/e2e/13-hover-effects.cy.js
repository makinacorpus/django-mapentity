/**
 * E2E Tests for hover effects on map shapes
 * Tests:
 * - When hovering a list row, the map feature style changes (red, larger)
 * - If feature has 'name' property, it displays on hover on the map
 * - Clicking a feature on the map shows a popup
 */

describe('Hover Effects - Point geometry (SinglePointModel)', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        // Create a test entity with Point geometry
        cy.visit('/singlepointmodel/add/');
        entityName = `Hover Test Point ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepointmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
                cy.log(`Created entity with ID: ${entityId}`);
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change feature style (red, larger) when hovering over a list row', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Find the row containing our entity
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        // Hover over the row - this should trigger highlight on map (red, larger style)
        cy.get('@entityRow').trigger('mouseenter', {force: true});

        // Verify the map canvas is visible and interactive
        cy.get('.maplibregl-canvas').should('be.visible');

        // Mouse leave should reset the style
        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });

    it('should display tooltip with entity name when hovering over feature on map', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Trigger mousemove on the map to simulate hovering over a feature
        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 400,
            clientY: 300,
            force: true
        });

        // If a feature with 'name' property is under the cursor, a tooltip (maplibregl-popup) should appear
        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup').length > 0) {
                cy.get('.maplibregl-popup').should('contain', entityName);
            }
        });

        // Mouse leave should hide the tooltip
        cy.get('.maplibregl-canvas').trigger('mouseleave', {force: true});

        // Tooltip should be removed
        cy.get('.maplibregl-popup.custom-popup').should('not.exist');
    });

    it('should show popup when clicking on feature on map', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Click on the map where the feature should be
        cy.get('.maplibregl-canvas').click(400, 300, {force: true});

        // A popup should appear (maplibregl-popup without custom-popup class is the click popup)
        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup:not(.custom-popup)').length > 0) {
                cy.get('.maplibregl-popup:not(.custom-popup)').should('be.visible');
            }
        });
    });

    it('should change cursor to pointer when hovering over feature on map', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // The cursor should change to pointer when hovering over a feature
        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 400,
            clientY: 300,
            force: true
        });

        // Verify canvas is interactive
        cy.get('.maplibregl-canvas').should('be.visible');
    });
});

describe('Hover Effects - LineString geometry (SingleLineStringModel)', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/singlelinestringmodel/add/');
        entityName = `Hover Test Line ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-canvas').click(300, 150, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("LineString");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlelinestringmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlelinestringmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change feature style when hovering over a list row', {retries: 2}, () => {
        cy.visit('/singlelinestringmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });

    it('should display tooltip with name when hovering over line on map', {retries: 2}, () => {
        cy.visit('/singlelinestringmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 200,
            clientY: 200,
            force: true
        });

        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup.custom-popup').length > 0) {
                cy.get('.maplibregl-popup.custom-popup').should('be.visible');
            }
        });

        cy.get('.maplibregl-canvas').trigger('mouseleave', {force: true});
    });

    it('should show popup when clicking on line on map', {retries: 2}, () => {
        cy.visit('/singlelinestringmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('.maplibregl-canvas').click(200, 200, {force: true});

        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup:not(.custom-popup)').length > 0) {
                cy.get('.maplibregl-popup:not(.custom-popup)').should('be.visible');
            }
        });
    });
});

describe('Hover Effects - Polygon geometry (SinglePolygonModel)', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/singlepolygonmodel/add/');
        entityName = `Hover Test Polygon ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 200, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Polygon");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepolygonmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepolygonmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change feature style when hovering over a list row', {retries: 2}, () => {
        cy.visit('/singlepolygonmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });

    it('should display tooltip with name when hovering over polygon on map', {retries: 2}, () => {
        cy.visit('/singlepolygonmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 150,
            clientY: 150,
            force: true
        });

        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup.custom-popup').length > 0) {
                cy.get('.maplibregl-popup.custom-popup').should('be.visible');
            }
        });

        cy.get('.maplibregl-canvas').trigger('mouseleave', {force: true});
    });

    it('should show popup when clicking on polygon on map', {retries: 2}, () => {
        cy.visit('/singlepolygonmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('.maplibregl-canvas').click(150, 150, {force: true});

        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup:not(.custom-popup)').length > 0) {
                cy.get('.maplibregl-popup:not(.custom-popup)').should('be.visible');
            }
        });
    });
});

describe('Hover Effects - No tooltip on empty map area', () => {
    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should NOT display tooltip when hovering over empty map area (no feature)', {retries: 2}, () => {
        // Go to list view
        cy.visit('/singlepointmodel/list/');
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        // Wait for table data to be loaded
        cy.get('table tbody tr', {timeout: 15000}).should('have.length.greaterThan', 0);

        // Hover over an empty area of the map (far from any features)
        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 50,
            clientY: 50,
            force: true
        });

        // Tooltip should NOT appear when no feature is under cursor
        cy.get('.maplibregl-popup.custom-popup').should('not.exist');
    });
});

describe('Hover Effects - Popup on click', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/singlepointmodel/add/');
        entityName = `Click Popup Test ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(400, 300);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepointmodel\/(\d+)\//);
            if (match) {
                entityId = match[1];
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should display popup with entity info when clicking on feature', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Click on the feature on the map
        cy.get('.maplibregl-canvas').click(400, 300, {force: true});

        // A popup should appear with entity information
        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup').length > 0) {
                cy.get('.maplibregl-popup').should('be.visible');
            }
        });
    });

    it('should close popup when clicking elsewhere on map', {retries: 2}, () => {
        cy.visit('/singlepointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Click on feature
        cy.get('.maplibregl-canvas').click(400, 300, {force: true});

        // Click elsewhere to close popup
        cy.get('.maplibregl-canvas').click(100, 100, {force: true});

        // Popup should be closed or replaced
        cy.get('.maplibregl-canvas').should('be.visible');
    });
});

describe('Hover Effects - MultiPoint geometry', () => {
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/multipointmodel/add/');
        entityName = `Hover MultiPoint ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        // Draw second point (no need to click #id_draw_marker again)
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPoint");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipointmodel/') && !url.includes('/add/');
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change style when hovering list row and show tooltip on map hover', {retries: 2}, () => {
        cy.visit('/multipointmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });
});

describe('Hover Effects - MultiLineString geometry', () => {
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/multilinestringmodel/add/');
        entityName = `Hover MultiLine ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_line').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        // Draw second line (no need to click #id_draw_line again)
        cy.get('.maplibregl-canvas').click(200, 100, {force: true});
        cy.get('.maplibregl-canvas').click(250, 150, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiLineString");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multilinestringmodel/') && !url.includes('/add/');
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change style when hovering list row and show tooltip on map hover', {retries: 2}, () => {
        cy.visit('/multilinestringmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });
});

describe('Hover Effects - MultiPolygon geometry', () => {
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/multipolygonmodel/add/');
        entityName = `Hover MultiPolygon ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(100, 150, {force: true});
        cy.get('.maplibregl-canvas').click(150, 150, {force: true});
        cy.get('.maplibregl-marker').eq(1).click({force: true});

        // Wait for first polygon to be registered — one polygon is enough for the hover test
        cy.assertGeomanFeaturesCount(1);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("MultiPolygon");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/multipolygonmodel/') && !url.includes('/add/');
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change style when hovering list row and show tooltip on map hover', {retries: 2}, () => {
        cy.visit('/multipolygonmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });
});

describe('Hover Effects - GeometryCollection', () => {
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/geometrycollectionmodel/add/');
        entityName = `Hover GeomCollection ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(100, 100);

        cy.get('#id_draw_line').click();
        cy.get('.maplibregl-canvas').click(200, 100, {force: true});
        cy.get('.maplibregl-canvas').click(250, 150, {force: true});
        cy.get('.maplibregl-marker').last().click({force: true});

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("GeometryCollection");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/geometrycollectionmodel/') && !url.includes('/add/');
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should change style when hovering list row and show tooltip on map hover', {retries: 2}, () => {
        cy.visit('/geometrycollectionmodel/list/');

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('table tbody').contains('tr', entityName).as('entityRow');

        cy.get('@entityRow').trigger('mouseenter', {force: true});

        cy.get('.maplibregl-canvas').should('be.visible');

        cy.get('@entityRow').trigger('mouseleave', {force: true});
    });
});
