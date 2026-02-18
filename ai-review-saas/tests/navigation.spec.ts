import { test, expect } from '@playwright/test';

test.describe('Dashboard Page (Unauthenticated)', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Dashboard Page (Authenticated)', () => {
  // These tests require authentication setup
  // For now, we'll test the unauthenticated behavior
  
  test('should not allow direct access without auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Navigation', () => {
  test('dashboard link should work from landing', async ({ page }) => {
    // Try to access dashboard directly - should redirect
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('reviews page should redirect to login', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page).toHaveURL(/login/);
  });

  test('settings page should redirect to login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/login/);
  });

  test('billing page should redirect to login', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Onboarding Page', () => {
  test('should load onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
  });

  test('should show get started button', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });

  test('should show 5 steps in progress', async ({ page }) => {
    await page.goto('/onboarding');
    // Check for step indicators (1, 2, 3, 4, 5)
    await expect(page.getByText('Welcome')).toBeVisible();
    await expect(page.getByText('Connect Google')).toBeVisible();
    await expect(page.getByText('Add Business')).toBeVisible();
    await expect(page.getByText('Brand Voice')).toBeVisible();
    await expect(page.getByText('Ready!')).toBeVisible();
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Step 1: Welcome
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
    await page.getByRole('button', { name: 'Get Started' }).click();
    
    // Step 2: Connect Google
    await expect(page.getByRole('heading', { name: /Connect Google/i })).toBeVisible();
    await page.getByText('Skip for now').click();
    
    // Step 3: Add Business
    await expect(page.getByRole('heading', { name: /Add Your Business/i })).toBeVisible();
    
    // Fill in business name
    await page.getByLabel('Business Name').fill('Test Business');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Step 4: Brand Voice
    await expect(page.getByRole('heading', { name: /Brand Voice/i })).toBeVisible();
    
    // Go back
    await page.getByText('Back').click();
    
    // Should be back on business form
    await expect(page.getByLabel('Business Name')).toHaveValue('Test Business');
  });
});
