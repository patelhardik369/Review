import { test, expect } from '@playwright/test';

test.describe('Billing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL('/login');
  });

  test('should display billing page title', async ({ page }) => {
    // This test would need authentication - marking as skipped for now
    test.skip();
  });
});

test.describe('Billing API - Checkout', () => {
  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: {
        priceId: 'price_test123',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 400 when priceId is missing', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('required');
  });
});

test.describe('Billing API - Subscription', () => {
  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.get('/api/stripe/subscriptions');
    expect(response.status()).toBe(401);
  });

  test('should return empty subscription when no subscription exists', async ({ request }) => {
    // This test would need authentication - marking as skipped for now
    test.skip();
  });
});

test.describe('Billing Flow', () => {
  test('should display available plans', async ({ page }) => {
    // This test would need authentication - marking as skipped for now
    test.skip();
  });

  test('should show upgrade button for non-current plans', async ({ page }) => {
    // This test would need authentication - marking as skipped for now
    test.skip();
  });
});
