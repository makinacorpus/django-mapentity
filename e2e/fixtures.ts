import { test as base, Page } from '@playwright/test';

/**
 * Authentication helper functions and fixtures
 */

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login/');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation to complete
  await page.waitForURL(/^(?!.*\/login)/);
}

export async function logout(page: Page) {
  // Wait for logout link to be visible before clicking
  const logoutLink = page.locator('a[href="/logout/"]');
  await logoutLink.waitFor({ state: 'visible', timeout: 5000 });
  await logoutLink.click();
  await page.waitForURL('/login/');
}

/**
 * Fixtures for authenticated users
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await login(page, 'e2e_user', 'user123');
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await login(page, 'e2e_admin', 'admin123');
    await use(page);
  },
});

export { expect } from '@playwright/test';
