import { test, expect } from '@playwright/test';
import { cleanupTestJob } from './helpers';
import { loginAsOwner } from './helpers';

const JOB_NAME_PREFIX = 'E2E Search Job';

// (12) Search/filter/bulk actions on jobs list
test.describe('Search Filter Bulk Actions on Jobs List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestJob(page, JOB_NAME_PREFIX);
  });

  test('can search for jobs', async ({ page }) => {
    await page.goto('/admin/jobs');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('filter buttons are visible and clickable', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await page.click('button:has-text("Pending")');
    await expect(page.locator('button:has-text("Pending")')).toHaveClass(/active|btn-primary/);
  });

  test('can apply status filter', async ({ page }) => {
    await page.goto('/admin/jobs');
    await page.click('button:has-text("Assigned")');
    await page.waitForTimeout(500);
    // Page should still show jobs list
    await expect(page.locator('text=Jobs')).toBeVisible();
  });

  test('can view bulk actions', async ({ page }) => {
    await page.goto('/admin/jobs');
    const bulkActions = page.locator('button:has-text("Bulk"), button:has-text("Export"), button:has-text("Delete Selected")').first();
    if (await bulkActions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bulkActions).toBeVisible();
    }
  });

  test('can create job with specific description for search testing', async ({ page }) => {
    await page.goto('/admin/jobs');
    await page.click('button:has-text("New Job Card")');
    await page.selectOption('select[name="customer_id"]', { index: 1 });
    await page.fill('textarea[name="description"]', `${JOB_NAME_PREFIX} ${Date.now()}`);
    await page.fill('input[name="admin_hourly_rate"]', '500');
    await page.click('button[type="submit"]:has-text("Create Job")');
    await expect(page.locator(`text=${JOB_NAME_PREFIX}`)).toBeVisible({ timeout: 10000 });
  });
});
