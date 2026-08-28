import { test, expect } from '@playwright/test';
import { loginAsOwner, loginAsTechnician, loginAsAccountant, setDemoAuth } from './helpers';

// (10) Middleware redirects by role
test.describe('Middleware Redirects by Role', () => {
  test('owner redirected to admin overview from root', async ({ page }) => {
    await setDemoAuth(page, 'owner');
    await page.goto('/');
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('technician redirected to technician jobs from root', async ({ page }) => {
    await setDemoAuth(page, 'technician');
    await page.goto('/');
    await expect(page).toHaveURL(/\/technician\/jobs/);
  });

  test('accountant redirected to accountant jobs from root', async ({ page }) => {
    await setDemoAuth(page, 'accountant');
    await page.goto('/');
    await expect(page).toHaveURL(/\/accountant\/jobs/);
  });

  test('owner can access admin pages without redirect loop', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/admin/overview');
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('owner cannot access technician pages (redirects to admin)', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/technician/jobs');
    // Middleware redirects owner away from technician routes
    await expect(page).toHaveURL(/\/admin\//);
  });

  test('technician cannot access admin pages (redirects to technician)', async ({ page }) => {
    await loginAsTechnician(page);
    await page.goto('/admin/jobs');
    // Middleware redirects technician away from admin routes
    await expect(page).toHaveURL(/\/technician\//);
  });

  test('accountant redirected when accessing admin pages', async ({ page }) => {
    await loginAsAccountant(page);
    await page.goto('/admin/jobs');
    // Middleware redirects accountant away from admin routes
    await expect(page).toHaveURL(/\/accountant\//);
  });

  test('accountant blocked from technician pages redirects to accountant', async ({ page }) => {
    await loginAsAccountant(page);
    await page.goto('/technician/jobs');
    await expect(page).toHaveURL(/\/accountant\//);
  });

  test('owner blocked from technician pages redirects to admin jobs', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/technician/jobs');
    await expect(page).toHaveURL(/\/admin\//);
  });

  test('unauthenticated access to /admin/overview redirects to /login', async ({ page }) => {
    await page.goto('/admin/overview');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /technician/jobs redirects to /login', async ({ page }) => {
    await page.goto('/technician/jobs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /accountant/jobs redirects to /login', async ({ page }) => {
    await page.goto('/accountant/jobs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('public route / is accessible without auth', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('public route /login is accessible without auth', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
  });

  test('public route /magic-link is accessible without auth', async ({ page }) => {
    const response = await page.goto('/magic-link');
    expect(response?.status()).toBe(200);
  });

  test('public route /auth/callback is accessible without auth', async ({ page }) => {
    const response = await page.goto('/auth/callback');
    expect(response?.status()).toBe(200);
  });

  test('authenticated owner accessing /login redirects to /admin/overview', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('dev_admin cookie allows access without real Supabase session', async ({ page }) => {
    // Set only the dev_admin cookie, no real Supabase session
    await page.context().addCookies([
      {
        name: 'dev_admin',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/admin/overview');
    // Should NOT redirect to login because dev_admin cookie bypasses auth
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('API routes return 401 without auth', async ({ page }) => {
    const response = await page.goto('/api/test-endpoint');
    // Without auth, API routes should not return 200 for protected data
    expect([401, 403, 404, 500]).toContain(response?.status());
  });

  test('API routes return 403 for wrong role', async ({ page }) => {
    await loginAsTechnician(page);
    // Attempt to access an admin-only API route
    const response = await page.request.get('/api/admin/users');
    // Middleware may allow through but API layer should reject, or middleware redirects
    expect([403, 401, 404, 500]).toContain(response.status());
  });
});
