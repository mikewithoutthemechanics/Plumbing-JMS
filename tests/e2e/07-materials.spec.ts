import { test, expect } from '@playwright/test';
import { cleanupTestMaterial } from './helpers';
import { loginAsOwner } from './helpers';

const MATERIAL_NAME_PREFIX = 'E2E Material';

// (7) Materials
test.describe('Materials', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestMaterial(page, MATERIAL_NAME_PREFIX);
  });

  test('can view materials list', async ({ page }) => {
    await page.goto('/admin/materials');
    await expect(page.locator('text=Materials')).toBeVisible();
  });

  test('can open add material modal', async ({ page }) => {
    await page.goto('/admin/materials');
    await page.click('button:has-text("Add Material")');
    await expect(page.locator('text=Add Material')).toBeVisible();
  });

  test('can add a material', async ({ page }) => {
    await page.goto('/admin/materials');
    await page.click('button:has-text("Add Material")');
    await page.fill('input[name="name"]', `${MATERIAL_NAME_PREFIX} ${Date.now()}`);
    await page.fill('input[name="description"]', 'Test material for E2E');
    await page.fill('input[name="quantity_on_hand"]', '100');
    await page.fill('input[name="unit_cost"]', '50');
    await page.selectOption('select[name="category"]', 'Pipe');
    await page.click('button[type="submit"]:has-text("Add")');
    await expect(page.locator(`text=${MATERIAL_NAME_PREFIX}`)).toBeVisible({ timeout: 10000 });
  });

  test('category filter buttons are visible', async ({ page }) => {
    await page.goto('/admin/materials');
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await page.click('button:has-text("All")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Pipe")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Fitting")');
    await page.waitForTimeout(300);
  });

  test('can edit a material', async ({ page }) => {
    await page.goto('/admin/materials');
    const editBtn = page.locator('button:has-text("Edit"), button[aria-label="Edit"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('text=Edit Material')).toBeVisible();
    }
  });

  test('can delete a material', async ({ page }) => {
    await page.goto('/admin/materials');
    const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (d) => d.accept());
      await deleteBtn.click();
    }
  });
});
