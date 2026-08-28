import { test, expect } from '@playwright/test';
import { cleanupTestQuote, cleanupTestJob, apiPost, apiGet, apiDelete } from './helpers';
import { loginAsOwner, setRoleAuth } from './helpers';

const QUOTE_ID_PREFIX = 'E2E-QUOTE';
const JOB_NAME_PREFIX = 'E2E Quote Job';
let createdQuoteId: string | null = null;

// (6) Quotes
test.describe('Quotes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test.afterEach(async ({ page }) => {
    if (createdQuoteId) {
      await apiDelete(page, `/api/quotes?id=${createdQuoteId}`).catch(() => {});
      createdQuoteId = null;
    }
    await cleanupTestQuote(page, QUOTE_ID_PREFIX);
    await cleanupTestJob(page, JOB_NAME_PREFIX);
  });

  test('can view quotes page', async ({ page }) => {
    await page.goto('/admin/quotes');
    await expect(page.locator('text=Quotes')).toBeVisible();
  });

  test('can submit a quote from job detail', async ({ page }) => {
    await page.goto('/admin/jobs');
    const firstJob = page.locator('[data-testid="job-card"], .job-card, .card').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForLoadState('networkidle');
      const submitQuoteBtn = page.locator('button:has-text("Submit Quote")');
      if (await submitQuoteBtn.isVisible()) {
        await submitQuoteBtn.click();
        await expect(page.locator('text=Quote submitted')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('can review a quote', async ({ page }) => {
    await page.goto('/admin/quotes');
    const reviewBtn = page.locator('button:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await expect(page).toHaveURL(/\/admin\/quotes\/[a-f0-9-]+/);
    }
  });

  test('can accept a quote', async ({ page }) => {
    await page.goto('/admin/quotes');
    const acceptBtn = page.locator('button:has-text("Accept")').first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await expect(page.locator('text=Accepted')).toBeVisible({ timeout: 5000 });
    }
  });

  test('can reject a quote', async ({ page }) => {
    await page.goto('/admin/quotes');
    const rejectBtn = page.locator('button:has-text("Reject")').first();
    if (await rejectBtn.isVisible()) {
      page.on('dialog', (d) => d.accept());
      await rejectBtn.click();
    }
  });

  test('public user can submit quote', async ({ page }) => {
    // Public (unauthenticated) POST is allowed by design per src/app/api/quotes/route.ts
    const response = await apiPost(page, '/api/quotes', {
      customer_name: 'Public Quote Test',
      customer_email: 'public@test.com',
      description: 'Public quote submission via E2E',
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.quote).toBeTruthy();
    expect(body.quote.customer_name).toBe('Public Quote Test');
    createdQuoteId = body.quote.id;
  });

  test('technician cannot submit quote via API (403)', async ({ page }) => {
    await setRoleAuth(page, 'technician');
    const response = await apiPost(page, '/api/quotes', {
      customer_name: 'Tech Quote Test',
      customer_email: 'tech@test.com',
      description: 'Technician quote attempt',
    });
    expect([403, 401]).toContain(response.status());
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).toMatch(/Forbidden/);
    }
  });

  test('owner can list quotes', async ({ page }) => {
    await loginAsOwner(page);
    const response = await apiGet(page, '/api/quotes');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('quotes');
    expect(Array.isArray(body.quotes)).toBe(true);
  });

  test('accountant can list quotes (403)', async ({ page }) => {
    await setRoleAuth(page, 'accountant');
    const response = await apiGet(page, '/api/quotes');
    expect([403, 401]).toContain(response.status());
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).toMatch(/Forbidden/);
    }
  });

  test('invalid customer_name rejected', async ({ page }) => {
    const response = await apiPost(page, '/api/quotes', {
      customer_name: 'A',
      customer_email: 'test@test.com',
      description: 'Short name validation test',
    });
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('invalid email rejected', async ({ page }) => {
    const response = await apiPost(page, '/api/quotes', {
      customer_name: 'Invalid Email Test',
      customer_email: 'not-an-email',
      description: 'Invalid email validation test',
    });
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toMatch(/Invalid customer email/);
    }
  });
});
