/**
 * Shared helper utilities for Playwright E2E tests.
 */

import { type Page, expect } from '@playwright/test';

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export async function loginAsOwner(page: Page) {
  await setDemoAuth(page, 'owner');
  await page.goto('/admin/overview');
  await page.waitForLoadState('networkidle');
}

export async function loginAsTechnician(page: Page) {
  await setDemoAuth(page, 'technician');
  await page.goto('/technician/jobs');
  await page.waitForLoadState('networkidle');
}

export async function loginAsAccountant(page: Page) {
  await setDemoAuth(page, 'accountant');
  await page.goto('/accountant/jobs');
  await page.waitForLoadState('networkidle');
}

export async function setDemoAuth(page: Page, role: 'owner' | 'technician' | 'accountant') {
  const authJson = JSON.stringify({
    user: {
      id: 'test-user-id',
      email: 'test@agentcy.co.za',
      user_metadata: { full_name: `Test ${role}` },
    },
    role,
  });

  // Set cookie for middleware bypass
  await page.context().addCookies([
    {
      name: 'dev_admin',
      value: '1',
      domain: 'localhost',
      path: '/',
    },
  ]);

  // Set localStorage for dashboard layout
  try {
    await page.goto('/');
  } catch {
    await page.goto('/login');
  }
  await page.evaluate((val) => {
    localStorage.setItem('devAuth', val);
  }, authJson);
}

export async function setRoleAuth(page: Page, role: 'owner' | 'technician' | 'accountant') {
  const authJson = JSON.stringify({
    user: {
      id: 'test-user-id',
      email: 'test@agentcy.co.za',
      user_metadata: { full_name: `Test ${role}` },
    },
    role,
  });

  await page.context().addCookies([
    {
      name: 'dev_admin',
      value: '1',
      domain: 'localhost',
      path: '/',
    },
  ]);

  // Use /login as a safe landing page for localStorage access
  await page.goto('/login');
  await page.evaluate((val) => {
    localStorage.setItem('devAuth', val);
  }, authJson);
}

export async function waitForToast(page: Page) {
  const toast = page.locator('[role="status"], .toast, .react-hot-toast');
  if (await toast.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    return toast.first();
  }
  return null;
}

export async function expectToastContains(page: Page, text: string) {
  const toast = page.locator(`[role="status"]:has-text("${text}"), .toast:has-text("${text}"), .react-hot-toast:has-text("${text}")`);
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function cleanupTestJob(page: Page, jobName: string) {
  try {
    await page.goto('/admin/jobs');
    const jobRow = page.locator(`text=${jobName}`).first();
    if (await jobRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible()) {
        page.on('dialog', (d) => d.accept());
        await deleteBtn.click();
      }
    }
  } catch {
    // ignore cleanup failures (e.g. role-based redirects in cross-role tests)
  }
}

export async function cleanupTestStaff(page: Page, email: string) {
  try {
    await page.goto('/admin/staff');
    const staffRow = page.locator(`text=${email}`).first();
    if (await staffRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const removeBtn = page.locator('button:has-text("Remove"), button:has-text("Delete")').first();
      if (await removeBtn.isVisible()) {
        page.on('dialog', (d) => d.accept());
        await removeBtn.click();
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

export async function cleanupTestMaterial(page: Page, materialName: string) {
  try {
    await page.goto('/admin/materials');
    const materialRow = page.locator(`text=${materialName}`).first();
    if (await materialRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible()) {
        page.on('dialog', (d) => d.accept());
        await deleteBtn.click();
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

export async function cleanupTestQuote(page: Page, quoteId: string) {
  try {
    await page.goto('/admin/quotes');
    const quoteRow = page.locator(`text=${quoteId}`).first();
    if (await quoteRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible()) {
        page.on('dialog', (d) => d.accept());
        await deleteBtn.click();
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

export async function apiPost(page: Page, path: string, body: unknown) {
  return page.request.post(path, { data: body });
}

export async function apiPatch(page: Page, path: string, body: unknown) {
  return page.request.patch(path, { data: body });
}

export async function apiDelete(page: Page, path: string) {
  return page.request.delete(path);
}

export async function apiGet(page: Page, path: string) {
  return page.request.get(path);
}
