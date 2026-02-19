import { test, expect, describe } from '@playwright/test';

describe('Notification Preferences API', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  describe('GET /api/cron/digest', () => {
    test('should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/digest`);
      expect(response.status()).toBe(401);
    });

    test('should return 401 with wrong token', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/digest`, {
        headers: {
          'Authorization': 'Bearer wrong-token'
        }
      });
      expect(response.status()).toBe(401);
    });
  });

  describe('GET /api/cron/reviews', () => {
    test('should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/reviews`);
      expect(response.status()).toBe(401);
    });

    test('should return 401 with wrong token', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/cron/reviews`, {
        headers: {
          'Authorization': 'Bearer wrong-token'
        }
      });
      expect(response.status()).toBe(401);
    });
  });
});

describe('Notification Preferences Form Validation', () => {
  test('should display all notification options', async ({ page }) => {
    await page.goto('/onboarding');
    
    await expect(page.getByText('When to notify')).toBeVisible();
    await expect(page.getByText('New reviews')).toBeVisible();
    await expect(page.getByText('Responses needed')).toBeVisible();
    await expect(page.getByText('Negative reviews (1-2 stars)')).toBeVisible();
  });

  test('digest frequency should have correct options', async ({ page }) => {
    await page.goto('/onboarding');
    
    const digestSelect = page.locator('select[name="email_digest"]');
    await expect(digestSelect).toHaveValue('none');
    
    await digestSelect.selectOption('daily');
    await expect(digestSelect).toHaveValue('daily');
    
    await digestSelect.selectOption('weekly');
    await expect(digestSelect).toHaveValue('weekly');
  });

  test('day of week should have all days', async ({ page }) => {
    await page.goto('/onboarding');
    
    const daySelect = page.locator('select[name="digest_send_day"]');
    const options = await daySelect.locator('option').allTextContents();
    
    expect(options).toContain('Sunday');
    expect(options).toContain('Monday');
    expect(options).toContain('Tuesday');
    expect(options).toContain('Wednesday');
    expect(options).toContain('Thursday');
    expect(options).toContain('Friday');
    expect(options).toContain('Saturday');
  });

  test('time input should accept time values', async ({ page }) => {
    await page.goto('/onboarding');
    
    const timeInput = page.locator('input[name="digest_send_time"]');
    await timeInput.fill('09:00');
    await expect(timeInput).toHaveValue('09:00');
    
    await timeInput.fill('23:59');
    await expect(timeInput).toHaveValue('23:59');
  });
});

describe('Responsive Design', () => {
  test('settings page should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/onboarding');
    
    await expect(page.getByRole('heading', { name: 'Notification Preferences' })).toBeVisible();
  });

  test('settings page should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/onboarding');
    
    await expect(page.getByRole('heading', { name: 'Notification Preferences' })).toBeVisible();
  });
});

describe('Accessibility', () => {
  test('notification form should have proper labels', async ({ page }) => {
    await page.goto('/onboarding');
    
    await expect(page.getByText('Email Notifications')).toBeVisible();
    await expect(page.getByText('When to notify')).toBeVisible();
    await expect(page.getByText('Email Digest')).toBeVisible();
  });

  test('form should have submit button', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByRole('button', { name: 'Save Notification Preferences' })).toBeEnabled();
  });
});
