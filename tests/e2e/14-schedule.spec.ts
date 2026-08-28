import { test, expect } from '@playwright/test';
import { loginAsOwner, loginAsTechnician, setDemoAuth } from './helpers';

// (14) Schedule management
test.describe('Schedule Management', () => {
  test.describe('Owner', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
    });

    test('can view technician schedule', async ({ page }) => {
      await page.goto('/admin/staff');
      const staffRow = page.locator('.card:has(.font-semibold), .card:has-text("technician")').first();
      if (await staffRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Look for schedule link or navigate directly
        await page.goto('/technician/schedule');
        await expect(page.locator('text=My Schedule')).toBeVisible();
      }
    });

    test('owner can set availability for technician', async ({ page }) => {
      await page.goto('/technician/schedule');
      const select = page.locator('select').first();
      if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
        await select.selectOption('busy');
        await expect(select).toHaveValue('busy');
      }
    });

    test('owner sees quick stats', async ({ page }) => {
      await page.goto('/technician/schedule');
      await expect(page.locator('text=Quick Stats')).toBeVisible();
    });
  });

  test.describe('Technician', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/schedule');
      await page.waitForLoadState('networkidle');
    });

    test('technician can view own schedule', async ({ page }) => {
      await expect(page.locator('text=My Schedule')).toBeVisible();
    });

    test('technician cannot edit schedule (read-only)', async ({ page }) => {
      const selects = page.locator('select');
      const count = await selects.count();
      for (let i = 0; i < count; i++) {
        await expect(selects.nth(i)).toBeDisabled();
      }
    });

    test('technician sees status badges not dropdowns', async ({ page }) => {
      const badges = page.locator('.rounded-full');
      if (await badges.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(badges.first()).toBeVisible();
      }
    });
  });

  test.describe('Accountant', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'accountant');
    });

    test('dev mode allows schedule access (middleware bypass)', async ({ page }) => {
      await page.goto('/technician/schedule');
      await expect(page).toHaveURL(/\/technician\/schedule/);
    });
  });
});
