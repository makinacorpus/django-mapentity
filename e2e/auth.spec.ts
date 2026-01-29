import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login/');
    await expect(page).toHaveTitle(/Login/);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[name="username"]', 'e2e_admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // After successful login, we should be redirected away from /login/
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[name="username"]', 'invalid_user');
    await page.fill('input[name="password"]', 'invalid_password');
    await page.click('button[type="submit"]');
    
    // Should stay on login page or show error
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ adminPage }) => {
    // adminPage is already authenticated
    await adminPage.goto('/');
    
    // Find and click logout link
    await adminPage.click('a[href="/logout/"]');
    
    // Should be redirected to login page
    await expect(adminPage).toHaveURL(/\/login/);
  });
});
