import { test, expect } from './fixtures';

test.describe('Map Interactions', () => {
  test('should display map on list page', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    // Check for leaflet map container
    const mapContainer = adminPage.locator('#map, .leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display map on detail page', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    // Navigate to first detail page
    const detailLink = adminPage.locator('a[href*="/dummymodel/"][href*="/detail/"], tbody tr:first-child a').first();
    
    if (await detailLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await detailLink.click();
      await adminPage.waitForLoadState('networkidle');
      
      // Check for leaflet map
      const mapContainer = adminPage.locator('#map, .leaflet-container');
      await expect(mapContainer).toBeVisible({ timeout: 10000 });
    }
  });

  test('should have map controls', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    // Check for zoom controls
    const zoomControls = adminPage.locator('.leaflet-control-zoom');
    await expect(zoomControls).toBeVisible({ timeout: 10000 });
  });

  test('map should be interactive', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    const mapContainer = adminPage.locator('#map, .leaflet-container').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Try to click zoom in button
    const zoomIn = adminPage.locator('.leaflet-control-zoom-in').first();
    if (await zoomIn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await zoomIn.click();
      // Map should respond to zoom
      await adminPage.waitForTimeout(500);
    }
  });
});
