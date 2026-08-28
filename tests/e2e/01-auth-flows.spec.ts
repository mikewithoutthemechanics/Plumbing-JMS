import { test, expect, type Page } from '@playwright/test';
import { expectToastContains, cleanupTestJob, cleanupTestStaff, cleanupTestMaterial, cleanupTestQuote } from './helpers';
import { loginAsOwner, loginAsTechnician, loginAsAccountant } from './helpers';

test.describe.configure({ retries: 1 });

// (1) Auth flows
test.describe('Authentication Flows', () => {
  test.describe('Login', () => {
    test('displays login page with email and password fields', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toHaveText('Sign In');
    });

    test('toggle to sign up shows full name field', async ({ page }) => {
      await page.goto('/login');
      await page.click('button:has-text("Don\'t have an account? Sign up")');
      await expect(page.locator('input[name="fullName"], input[id="fullName"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toHaveText('Create Account');
    });

    test('sign up form is visible after toggle', async ({ page }) => {
      await page.goto('/login');
      await page.click('button:has-text("Don\'t have an account? Sign up")');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('google oauth button is visible', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    });

    test('google oauth button click initiates redirect', async ({ page }) => {
      await page.goto('/login');
      await page.click('button:has-text("Continue with Google")');
      // Supabase OAuth redirects to Google; verify URL changed away from /login
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('sign in with invalid credentials shows error', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'invalid@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('.text-error-700, [role="alert"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Magic Link', () => {
    test('navigates to magic-link page when email is provided', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'test@test.com');
      await page.click('button:has-text("Send magic link instead")');
      await expect(page).toHaveURL(/\/magic-link/);
    });

    test('magic link page shows back to login link', async ({ page }) => {
      await page.goto('/magic-link');
      await expect(page.locator('a:has-text("Back to Login")')).toBeVisible();
    });

    test('back to login navigates back', async ({ page }) => {
      await page.goto('/magic-link');
      await page.click('a:has-text("Back to Login")');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Google OAuth Callback', () => {
    test('callback page shows completing sign in status', async ({ page }) => {
      await page.goto('/auth/callback');
      await expect(page.locator('text=Completing sign in')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('logout redirects to login page and clears devAuth', async ({ page }) => {
      await loginAsOwner(page);
      // Verify devAuth is set before logout
      const devAuthBefore = await page.evaluate(() => localStorage.getItem('devAuth'));
      expect(devAuthBefore).not.toBeNull();
      await page.click('button:has-text("Logout")');
      await expect(page).toHaveURL(/\/login/);
      // Verify devAuth is cleared after logout
      const devAuthAfter = await page.evaluate(() => localStorage.getItem('devAuth'));
      expect(devAuthAfter).toBeNull();
    });
  });

  test.describe('Role Redirects', () => {
    test('owner can access admin pages', async ({ page }) => {
      await loginAsOwner(page);
      await expect(page).toHaveURL(/\/admin\/overview/);
    });

    test('technician can access technician pages', async ({ page }) => {
      await loginAsTechnician(page);
      await expect(page).toHaveURL(/\/technician\/jobs/);
    });

    test('accountant can access accountant pages', async ({ page }) => {
      await loginAsAccountant(page);
      await expect(page).toHaveURL(/\/accountant\/jobs/);
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/admin/overview');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
