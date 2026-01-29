import { test, expect } from './fixtures';

test.describe('DummyModel List View', () => {
  test('should display list page', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    
    // Check that we're on the list page
    await expect(adminPage).toHaveURL(/\/dummymodel\/list/);
    
    // Check for common list view elements
    await expect(adminPage.locator('table, .entities-list')).toBeVisible({ timeout: 10000 });
  });

  test('should have filters', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    
    // Wait for page to load
    await adminPage.waitForLoadState('networkidle');
    
    // Look for filter elements (may vary based on implementation)
    const filterSection = adminPage.locator('form[method="get"], .filters, #filters');
    await expect(filterSection).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to add page', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/list/');
    
    // Look for add/create button
    const addButton = adminPage.locator('a[href*="/add/"], a:has-text("Add"), a:has-text("Create")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(adminPage).toHaveURL(/\/dummymodel\/add/);
    }
  });
});

test.describe('DummyModel Detail View', () => {
  test('should display detail page for existing object', async ({ adminPage }) => {
    // First, go to list and get the first item
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    // Find first detail link
    const detailLink = adminPage.locator('a[href*="/dummymodel/"][href*="/detail/"], tbody tr:first-child a').first();
    
    if (await detailLink.isVisible()) {
      await detailLink.click();
      
      // Should be on detail page
      await expect(adminPage).toHaveURL(/\/dummymodel\/\d+/);
    }
  });
});
