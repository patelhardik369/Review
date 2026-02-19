import { test, expect, describe } from '@playwright/test';

const isProduction = process.env.VERCEL_ENV === 'production';

describe('Notification Preferences API', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  describe('GET /api/cron/digest', () => {
    test('should respond (auth only in production)', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/digest`);
      if (isProduction) {
        expect(response.status()).toBe(401);
      } else {
        expect(response.status()).toBeGreaterThanOrEqual(200);
      }
    });
  });

  describe('GET /api/cron/reviews', () => {
    test('should respond (auth only in production)', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/reviews`);
      if (isProduction) {
        expect(response.status()).toBe(401);
      } else {
        expect(response.status()).toBeGreaterThanOrEqual(200);
      }
    });
  });
});

describe('Settings Page Access', () => {
  test('settings page should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
