import { test, expect } from '@playwright/test';

const BASE = 'https://plumbing-jms.vercel.app';
const OWNER = { email: 'e2e.owner@test.punctualplumbers.co.za', password: 'OwN3r-E2E-9xQ7!vLm2#Kp8Z' };

test.describe('Fix Validation', () => {
  test.describe.configure({ retries: 1 });

  // Helper: login via UI and wait for redirect
  async function loginAs(page: import('@playwright/test').Page) {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/overview/, { timeout: 15000 });
  }

  // FIX C3: dev_admin cookie disabled in production
  test('C3: dev_admin cookie does not bypass auth in production', async ({ page }) => {
    // Set dev_admin cookie — should NOT bypass auth in production
    await page.context().addCookies([{ name: 'dev_admin', value: '1', domain: 'plumbing-jms.vercel.app', path: '/' }]);
    await page.goto(`${BASE}/admin/overview`);
    await page.waitForLoadState('networkidle');
    // Should be redirected to login, not see the admin page
    expect(page.url()).toContain('/login');
  });

  // FIX C3: NEXT_PUBLIC_DEMO_MODE disabled in production
  test('C3: demo mode env var does not bypass auth in production', async ({ page }) => {
    await page.goto(`${BASE}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  // FIX C1: Jobs page loads with recalculated totals
  test('C1: Jobs page loads successfully for owner', async ({ page }) => {
    await loginAs(page);
    await page.goto(`${BASE}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    // Page heading says "Job Cards" (second h1 after brand logo)
    await expect(page.getByRole('heading', { name: 'Job Cards' })).toBeVisible({ timeout: 10000 });
  });

  // FIX C2: Quotes page loads (fixed broken join)
  test('C2: Quotes page loads without error', async ({ page }) => {
    await loginAs(page);
    await page.goto(`${BASE}/admin/quotes`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Quote Requests' })).toBeVisible({ timeout: 10000 });
    // Should not show any database error
    await expect(page.locator('body')).not.toContainText('customers(name)');
    await expect(page.locator('body')).not.toContainText('relation');
  });

  // FIX: Middleware catch-all — bad cookie on page route redirects to /login
  test('Middleware: bad cookie on page route redirects to /login', async ({ page }) => {
    await page.context().addCookies([{ name: 'sb-sunjjexcyfrlucitngwx-auth-token', value: 'garbage', domain: 'plumbing-jms.vercel.app', path: '/' }]);
    await page.goto(`${BASE}/admin/overview`);
    await page.waitForLoadState('networkidle');
    // Should redirect to login (middleware error -> redirect)
    expect(page.url()).toContain('/login');
  });

  // FIX: All pages render without 500 errors
  const pages = [
    { path: '/admin/overview', expected: /overview/i },
    { path: '/admin/jobs', expected: /jobs/i },
    { path: '/admin/staff', expected: /staff/i },
    { path: '/admin/customers', expected: /customer/i },
    { path: '/admin/materials', expected: /material/i },
    { path: '/admin/quotes', expected: /quote/i },
    { path: '/admin/reports', expected: /report/i },
  ];

  for (const { path } of pages) {
    test(`Page renders: ${path}`, async ({ page }) => {
      await loginAs(page);
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');
      // Should not be on login page (auth worked)
      expect(page.url()).not.toContain('/login');
      // Should show any heading content (page rendered)
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });
  }
});
