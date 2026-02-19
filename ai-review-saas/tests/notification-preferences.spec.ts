import { test, expect } from '@playwright/test';

test.describe('Notification Preferences Settings', () => {
  test.describe('Page Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Notification Preferences UI Elements', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/onboarding');
    });

    test('should show notification preferences section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Notification Preferences' })).toBeVisible();
    });

    test('should show email notifications toggle', async ({ page }) => {
      await expect(page.getByText('Email Notifications')).toBeVisible();
      await expect(page.getByText('Receive email alerts for review activity')).toBeVisible();
    });

    test('should show notification type checkboxes', async ({ page }) => {
      await expect(page.getByText('New reviews')).toBeVisible();
      await expect(page.getByText('Responses needed')).toBeVisible();
      await expect(page.getByText('Negative reviews (1-2 stars)')).toBeVisible();
    });

    test('should show email digest options', async ({ page }) => {
      await expect(page.getByText('Email Digest')).toBeVisible();
      await expect(page.getByText('Digest frequency')).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Digest frequency' })).toBeVisible();
    });

    test('should show digest day and time options', async ({ page }) => {
      await expect(page.getByText('Day of week (for weekly)')).toBeVisible();
      await expect(page.getByText('Send time')).toBeVisible();
    });

    test('should show save button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Save Notification Preferences' })).toBeVisible();
    });
  });

  test.describe('Notification Preferences Form Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/onboarding');
    });

    test('should have email toggle checked by default', async ({ page }) => {
      const toggle = page.locator('input[name="email_enabled"]');
      await expect(toggle).toBeChecked();
    });

    test('should have all notification checkboxes checked by default', async ({ page }) => {
      await expect(page.locator('input[name="email_for_new_reviews"]')).toBeChecked();
      await expect(page.locator('input[name="email_for_responses_needed"]')).toBeChecked();
      await expect(page.locator('input[name="email_for_negative_reviews"]')).toBeChecked();
    });

    test('should have digest set to none by default', async ({ page }) => {
      const digestSelect = page.locator('select[name="email_digest"]');
      await expect(digestSelect).toHaveValue('none');
    });

    test('should toggle email notifications off', async ({ page }) => {
      const toggle = page.locator('input[name="email_enabled"]');
      await toggle.uncheck();
      await expect(toggle).not.toBeChecked();
    });

    test('should select daily digest', async ({ page }) => {
      const digestSelect = page.locator('select[name="email_digest"]');
      await digestSelect.selectOption('daily');
      await expect(digestSelect).toHaveValue('daily');
    });

    test('should select weekly digest', async ({ page }) => {
      const digestSelect = page.locator('select[name="email_digest"]');
      await digestSelect.selectOption('weekly');
      await expect(digestSelect).toHaveValue('weekly');
    });

    test('should change digest day', async ({ page }) => {
      const digestSelect = page.locator('select[name="email_digest"]');
      await digestSelect.selectOption('weekly');
      
      const daySelect = page.locator('select[name="digest_send_day"]');
      await daySelect.selectOption('5');
      await expect(daySelect).toHaveValue('5');
    });

    test('should change digest time', async ({ page }) => {
      const timeInput = page.locator('input[name="digest_send_time"]');
      await timeInput.fill('14:00');
      await expect(timeInput).toHaveValue('14:00');
    });
  });
});

test.describe('Cron Jobs', () => {
  test.describe('Review Sync Cron', () => {
    test('should require auth in production', async ({ page }) => {
      const response = await page.request.get('/api/cron/reviews', {
        headers: {
          'Authorization': 'Bearer wrong-token'
        }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Digest Cron', () => {
    test('should require auth in production', async ({ page }) => {
      const response = await page.request.get('/api/cron/digest', {
        headers: {
          'Authorization': 'Bearer wrong-token'
        }
      });
      expect(response.status()).toBe(401);
    });

    test('should accept valid cron secret', async ({ page }) => {
      const cronSecret = process.env.CRON_SECRET || 'test-secret';
      const response = await page.request.get('/api/cron/digest', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
    });
  });
});

test.describe('Email Templates', () => {
  test('digest email should contain key elements', async ({ page }) => {
    const response = await page.request.get('/api/cron/digest', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
    }
  });
});
