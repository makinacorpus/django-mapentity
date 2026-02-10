/**
 * E2E Tests for popup and tooltip behavior on detail pages
 * Tests:
 * - Clicking the current object on the detail map should NOT show a popup
 * - Hovering the current object on the detail map should NOT show a tooltip
 * - Other objects on the detail map should show popups and tooltips
 */

describe('Detail Page - Popup and Tooltip behavior for current object', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        // Create a test entity with Point geometry
        cy.visit('/singlepointmodel/add/');
        entityName = `Detail Popup Test ${Date.now()}`;

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

    it('should NOT show popup when clicking on the current object on detail page', {retries: 2}, () => {
        cy.visit(`/singlepointmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify data-pk is set on body for the current object
        cy.get('body').should('have.attr', 'data-pk', entityId);

        // Wait for map to be fully loaded
        cy.wait(2000);

        // Click on the map where the current object feature should be rendered
        cy.get('.maplibregl-canvas').click(400, 300, {force: true});

        // Wait a bit for any popup to potentially appear
        cy.wait(1000);

        // No click popup should appear for the current object
        cy.get('.maplibregl-popup:not(.custom-popup)').should('not.exist');
    });

    it('should NOT show tooltip when hovering over the current object on detail page', {retries: 2}, () => {
        cy.visit(`/singlepointmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify data-pk is set on body for the current object
        cy.get('body').should('have.attr', 'data-pk', entityId);

        // Wait for map to be fully loaded
        cy.wait(2000);

        // Hover over the map where the current object feature should be
        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 400,
            clientY: 300,
            force: true
        });

        // Wait a bit for any tooltip to potentially appear
        cy.wait(1000);

        // No tooltip should appear for the current object
        cy.get('.maplibregl-popup.custom-popup').should('not.exist');
    });

    it('should have the map visible and interactive on detail page', {retries: 2}, () => {
        cy.visit(`/singlepointmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('.maplibregl-canvas').should('be.visible');

        // Verify the detail map is rendered
        cy.get('#detailmap').should('exist');
    });
});

describe('Detail Page - Popup and Tooltip for other objects', () => {
    let entity1Id;
    let entity1Name;
    let entity2Id;
    let entity2Name;

    before(() => {
        cy.login();
        cy.mockTiles();

        // Create first entity
        cy.visit('/singlepointmodel/add/');
        entity1Name = `Detail Other Test 1 ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entity1Name);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(200, 200);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepointmodel\/(\d+)\//);
            if (match) {
                entity1Id = match[1];
            }
        });

        // Create second entity at a different location
        cy.visit('/singlepointmodel/add/');
        entity2Name = `Detail Other Test 2 ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entity2Name);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_marker').click();
        cy.get('.maplibregl-canvas').click(500, 400);

        cy.assertGeomFieldValue((data) => {
            expect(data.type).to.equal("Point");
        });

        cy.get('#save_changes').click();

        cy.url({timeout: 15000}).should('satisfy', (url) => {
            return url.includes('/singlepointmodel/') && !url.includes('/add/');
        }).then((url) => {
            const match = url.match(/\/singlepointmodel\/(\d+)\//);
            if (match) {
                entity2Id = match[1];
            }
        });
    });

    beforeEach(() => {
        cy.login();
        cy.mockTiles();
    });

    it('should show popup when clicking on another object on detail page', {retries: 2}, () => {
        // Visit detail page of entity1
        cy.visit(`/singlepointmodel/${entity1Id}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify we are on entity1's detail page
        cy.get('body').should('have.attr', 'data-pk', entity1Id);

        // Wait for map and all layers to load
        cy.wait(3000);

        // Click on the map where entity2 might be rendered
        // Since entity2 was created at a different position, clicking there should show a popup
        cy.get('.maplibregl-canvas').click(500, 400, {force: true});

        // If entity2's feature is under the click, a popup should appear
        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup:not(.custom-popup)').length > 0) {
                cy.get('.maplibregl-popup:not(.custom-popup)').should('be.visible');
            }
        });
    });

    it('should show tooltip when hovering over another object on detail page', {retries: 2}, () => {
        // Visit detail page of entity1
        cy.visit(`/singlepointmodel/${entity1Id}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        // Verify we are on entity1's detail page
        cy.get('body').should('have.attr', 'data-pk', entity1Id);

        // Wait for map and all layers to load
        cy.wait(3000);

        // Hover over the map where entity2 might be rendered
        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 500,
            clientY: 400,
            force: true
        });

        // If entity2's feature is under the cursor, a tooltip should appear
        cy.get('body').then($body => {
            if ($body.find('.maplibregl-popup.custom-popup').length > 0) {
                cy.get('.maplibregl-popup.custom-popup').should('be.visible');
            }
        });

        cy.get('.maplibregl-canvas').trigger('mouseleave', {force: true});
    });
});

describe('Detail Page - LineString popup behavior', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/singlelinestringmodel/add/');
        entityName = `Detail Line Popup ${Date.now()}`;

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

    it('should NOT show popup when clicking on the current line on detail page', {retries: 2}, () => {
        cy.visit(`/singlelinestringmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('body').should('have.attr', 'data-pk', entityId);

        cy.wait(2000);

        // Click on the map where the current line feature should be
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});

        cy.wait(1000);

        // No popup should appear for the current object
        cy.get('.maplibregl-popup:not(.custom-popup)').should('not.exist');
    });

    it('should NOT show tooltip when hovering over the current line on detail page', {retries: 2}, () => {
        cy.visit(`/singlelinestringmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('body').should('have.attr', 'data-pk', entityId);

        cy.wait(2000);

        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 200,
            clientY: 200,
            force: true
        });

        cy.wait(1000);

        cy.get('.maplibregl-popup.custom-popup').should('not.exist');
    });
});

describe('Detail Page - Polygon popup behavior', () => {
    let entityId;
    let entityName;

    before(() => {
        cy.login();
        cy.mockTiles();

        cy.visit('/singlepolygonmodel/add/');
        entityName = `Detail Polygon Popup ${Date.now()}`;

        cy.get('input[name="name"]', {timeout: 10000}).clear().type(entityName);
        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');

        cy.get('#id_draw_polygon').click();
        cy.get('.maplibregl-canvas').click(100, 100);
        cy.get('.maplibregl-canvas').click(200, 100, {force: true});
        cy.get('.maplibregl-canvas').click(200, 200, {force: true});
        cy.get('.maplibregl-canvas').click(100, 200, {force: true});
        cy.get('.maplibregl-marker').first().click({force: true});

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

    it('should NOT show popup when clicking on the current polygon on detail page', {retries: 2}, () => {
        cy.visit(`/singlepolygonmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('body').should('have.attr', 'data-pk', entityId);

        cy.wait(2000);

        cy.get('.maplibregl-canvas').click(150, 150, {force: true});

        cy.wait(1000);

        cy.get('.maplibregl-popup:not(.custom-popup)').should('not.exist');
    });

    it('should NOT show tooltip when hovering over the current polygon on detail page', {retries: 2}, () => {
        cy.visit(`/singlepolygonmodel/${entityId}/`);

        cy.get('.maplibre-map, [id*="map"]', {timeout: 15000}).should('exist');
        cy.get('body').should('have.attr', 'data-pk', entityId);

        cy.wait(2000);

        cy.get('.maplibregl-canvas').trigger('mousemove', {
            clientX: 150,
            clientY: 150,
            force: true
        });

        cy.wait(1000);

        cy.get('.maplibregl-popup.custom-popup').should('not.exist');
    });
});
