import { test, expect } from '@playwright/test';

test.describe('Notification Preferences Settings', () => {
  test.describe('Page Access (Unauthenticated)', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('API Endpoints', () => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

    test('digest cron should respond', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/digest`);
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });

    test('reviews cron should respond', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/reviews`);
      expect(response.status()).toBeGreaterThanOrEqual(200);
    });
  });
});
