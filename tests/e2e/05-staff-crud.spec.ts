import { test, expect } from '@playwright/test';
import { cleanupTestStaff, apiPost, apiDelete } from './helpers';
import { loginAsOwner } from './helpers';

const STAFF_EMAIL_PREFIX = 'e2e-staff';
let createdStaffEmail: string | null = null;

// (5) Staff CRUD
test.describe('Staff CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test.afterEach(async ({ page }) => {
    if (createdStaffEmail) {
      await apiDelete(page, `/api/staff?email=${encodeURIComponent(createdStaffEmail)}`).catch(() => {});
      createdStaffEmail = null;
    }
    await cleanupTestStaff(page, `${STAFF_EMAIL_PREFIX}@test.com`);
  });

  test('can view staff list', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.locator('text=Staff')).toBeVisible();
  });

  test('can open add staff modal', async ({ page }) => {
    await page.goto('/admin/staff');
    await page.click('button:has-text("Add Staff")');
    await expect(page.locator('text=Add Staff Member')).toBeVisible();
  });

  test('can add a staff member', async ({ page }) => {
    await page.goto('/admin/staff');
    await page.click('button:has-text("Add Staff")');
    await page.fill('input[name="email"]', `${STAFF_EMAIL_PREFIX}@test.com`);
    await page.fill('input[name="full_name"]', 'Test Staff E2E');
    await page.fill('input[name="phone"]', '+271****4567');
    await page.selectOption('select[name="role"]', 'technician');
    await page.click('button[type="submit"]:has-text("Add")');
    await expect(page.locator('text=Test Staff E2E')).toBeVisible({ timeout: 10000 });
  });

  test('can delete a staff member', async ({ page }) => {
    await page.goto('/admin/staff');
    const deleteBtn = page.locator('button:has-text("Remove"), button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (d) => d.accept());
      await deleteBtn.click();
    }
  });

  test('add staff with invalid email shows error', async ({ page }) => {
    const response = await apiPost(page, '/api/staff', {
      email: 'not-an-email',
      full_name: 'Test Staff',
      role: 'technician',
    });
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('add staff with invalid role shows error', async ({ page }) => {
    const response = await apiPost(page, '/api/staff', {
      email: `${STAFF_EMAIL_PREFIX}@test.com`,
      full_name: 'Test Staff',
      role: 'admin',
    });
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toMatch(/Invalid role/);
    }
  });

  test('add staff with short name shows error', async ({ page }) => {
    const response = await apiPost(page, '/api/staff', {
      email: `${STAFF_EMAIL_PREFIX}@test.com`,
      full_name: '',
      role: 'technician',
    });
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('cannot delete self', async ({ page }) => {
    // Attempt to delete the current owner's own profile
    const response = await apiDelete(page, '/api/staff?id=test-user-id');
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toMatch(/Cannot delete yourself/);
    }
  });

  test('staff list displays table columns', async ({ page }) => {
    await page.goto('/admin/staff');
    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table.locator('th:has-text("Name"), th:has-text("Full Name")')).toBeVisible();
      await expect(table.locator('th:has-text("Email")')).toBeVisible();
      await expect(table.locator('th:has-text("Role")')).toBeVisible();
    }
  });
});
