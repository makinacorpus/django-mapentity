import { test, expect } from './fixtures';

test.describe('DummyModel CRUD Operations', () => {
  test('should create a new DummyModel', async ({ adminPage }) => {
    await adminPage.goto('/dummymodel/add/');
    
    // Fill in the form
    await adminPage.fill('input[name="name"], #id_name', 'E2E Test Model');
    
    // If there's a description field
    const descField = adminPage.locator('textarea[name="description"], #id_description');
    if (await descField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descField.fill('This is a test description created by E2E tests');
    }
    
    // Submit the form
    await adminPage.click('button[type="submit"], input[type="submit"]');
    
    // Wait for redirect after creation
    await adminPage.waitForURL(/\/dummymodel\/\d+/, { timeout: 10000 });
  });

  test('should edit an existing DummyModel', async ({ adminPage }) => {
    // Go to list page
    await adminPage.goto('/dummymodel/list/');
    await adminPage.waitForLoadState('networkidle');
    
    // Find first edit link
    const editLink = adminPage.locator('a[href*="/update/"], a:has-text("Edit")').first();
    
    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click();
      
      // Should be on edit page
      await expect(adminPage).toHaveURL(/\/dummymodel\/\d+\/update/);
      
      // Modify the name
      const nameField = adminPage.locator('input[name="name"], #id_name');
      const currentValue = await nameField.inputValue();
      await nameField.fill(currentValue + ' - Updated');
      
      // Submit the form
      await adminPage.click('button[type="submit"], input[type="submit"]');
      
      // Wait for redirect
      await adminPage.waitForURL(/\/dummymodel\/\d+/, { timeout: 10000 });
    }
  });

  test('should delete a DummyModel', async ({ adminPage }) => {
    // First create a model to delete
    await adminPage.goto('/dummymodel/add/');
    await adminPage.fill('input[name="name"], #id_name', 'Model to Delete');
    await adminPage.click('button[type="submit"], input[type="submit"]');
    await adminPage.waitForURL(/\/dummymodel\/\d+/, { timeout: 10000 });
    
    // Find delete button/link
    const deleteLink = adminPage.locator('a[href*="/delete/"], button:has-text("Delete")').first();
    
    if (await deleteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Register dialog handler before clicking to avoid race condition
      adminPage.on('dialog', dialog => dialog.accept());
      
      await deleteLink.click();
      
      // Or if there's a confirmation page with a submit button
      const confirmButton = adminPage.locator('button[type="submit"]:has-text("Confirm"), input[value*="confirm" i]');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      // Should redirect to list page
      await adminPage.waitForURL(/\/dummymodel\/list/, { timeout: 10000 });
    }
  });
});
