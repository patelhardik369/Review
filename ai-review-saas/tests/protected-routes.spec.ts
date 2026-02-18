import { test, expect } from '@playwright/test';

test.describe('Reviews Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Settings Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Billing Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Analytics Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Brand Settings Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/settings/brand');
    await expect(page).toHaveURL(/login/);
  });
});
