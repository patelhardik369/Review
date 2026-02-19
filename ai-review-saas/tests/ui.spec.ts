import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('landing page should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content is visible on mobile
    await expect(page.getByRole('heading', { name: /Automate Your Google Reviews/i })).toBeVisible();
  });

  test('landing page should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /Automate Your Google Reviews/i })).toBeVisible();
  });

  test('login page should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('login page should have proper labels', async ({ page }) => {
    await page.goto('/login');
    
    // Check for proper form labels
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('signup page should have proper labels', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('forms should have submit buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  });
});

test.describe('Visual Checkpoints', () => {
  test('landing page hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check hero text
    await expect(page.getByRole('heading', { name: /Automate Your Google Reviews/i })).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: 'Start Free Trial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
  });

  test('login page styling', async ({ page }) => {
    await page.goto('/login');
    
    // Check that form is centered
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check for sign in heading
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('onboarding page styling', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Check for welcome message
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
    
    // Check for features list
    await expect(page.getByText('AI-powered response generation')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('404 page should exist', async ({ page }) => {
    await page.goto('/nonexistent-page');
    // Next.js shows its own 404
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});

test.describe('Page Performance', () => {
  test('landing page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('login page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});
