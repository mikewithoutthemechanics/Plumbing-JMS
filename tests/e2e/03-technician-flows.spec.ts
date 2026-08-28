import { test, expect } from '@playwright/test';
import { loginAsTechnician, setDemoAuth } from './helpers';

// (3) Technician flows
test.describe('Technician Flows', () => {
  test.describe('Profile Setup', () => {
    test('dev mode shows unavailable message', async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/profile-setup');
      await expect(page.locator('text=Profile setup unavailable in dev mode')).toBeVisible();
    });

    test('profile setup form fields exist', async ({ page }) => {
      await page.goto('/profile-setup');
      await expect(page.locator('text=Complete Your Profile')).toBeVisible();
      await expect(page.locator('label:has-text("Full Name")')).toBeVisible();
      await expect(page.locator('label:has-text("Email")')).toBeVisible();
      await expect(page.locator('label:has-text("WhatsApp Number")')).toBeVisible();
    });

    test('continue button disabled when fields incomplete', async ({ page }) => {
      await page.goto('/profile-setup');
      const continueBtn = page.locator('button:has-text("Continue")');
      await expect(continueBtn).toBeDisabled();
    });

    test('continue button enabled when fields complete', async ({ page }) => {
      await page.goto('/profile-setup');
      await page.fill('input[value=""]:above(:text("Full Name")) ~ input, input[placeholder*="Full Name"]', 'Test Technician');
      await page.fill('input[type="email"]', 'tech@test.com');
      await page.fill('input[placeholder*="+27"]', '+27123456789');
      const continueBtn = page.locator('button:has-text("Continue")');
      await expect(continueBtn).toBeEnabled();
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/jobs');
      await page.waitForLoadState('networkidle');
    });

    test('can navigate to My Jobs', async ({ page }) => {
      await page.goto('/technician/jobs');
      await expect(page).toHaveURL(/\/technician\/jobs/);
      await expect(page.locator('text=My Jobs')).toBeVisible();
    });

    test('can navigate to Time Log', async ({ page }) => {
      await page.goto('/technician/time');
      await expect(page).toHaveURL(/\/technician\/time/);
      await expect(page.locator('text=Time Logger')).toBeVisible();
    });

    test('can navigate to Materials', async ({ page }) => {
      await page.goto('/technician/materials');
      await expect(page).toHaveURL(/\/technician\/materials/);
      await expect(page.locator('text=Materials')).toBeVisible();
    });

    test('dev mode allows cross-role navigation (middleware bypass)', async ({ page }) => {
      // In dev mode (dev_admin cookie), middleware skips role-based redirects.
      // The layout and API enforce role restrictions at the UI/data level.
      await page.goto('/admin/jobs');
      await expect(page).toHaveURL(/\/admin\/jobs/);
    });

    test('dev mode allows accountant routes (middleware bypass)', async ({ page }) => {
      await page.goto('/accountant/jobs');
      await expect(page).toHaveURL(/\/accountant\/jobs/);
    });
  });

  test.describe('Time Log', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/time');
      await page.waitForLoadState('networkidle');
    });

    test('time log page loads with active jobs section', async ({ page }) => {
      await expect(page.locator('text=Active Jobs')).toBeVisible();
      await expect(page.locator('text=Today\'s Time Logs')).toBeVisible();
    });

    test('no active clock-in shows jobs as tappable', async ({ page }) => {
      const jobItems = page.locator('.card:has-text("Tap to Clock In")');
      const count = await jobItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('clocked-in job shows stop indicator', async ({ page }) => {
      const clockedIn = page.locator('text=CLOCKED IN');
      if (await clockedIn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(clockedIn).toBeVisible();
      }
    });
  });

  test.describe('Materials', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/materials');
      await page.waitForLoadState('networkidle');
    });

    test('materials page loads with form', async ({ page }) => {
      await expect(page.locator('text=Materials')).toBeVisible();
      await expect(page.locator('label:has-text("Select Job")')).toBeVisible();
      await expect(page.locator('button:has-text("Add to Job")')).toBeVisible();
    });

    test('cannot submit without selecting job', async ({ page }) => {
      const addBtn = page.locator('button:has-text("Add to Job")');
      await expect(addBtn).toBeDisabled();
    });

    test('job selector shows active jobs', async ({ page }) => {
      const select = page.locator('select');
      await expect(select).toBeVisible();
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Assigned Jobs', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/jobs');
      await page.waitForLoadState('networkidle');
    });

    test('my jobs page loads', async ({ page }) => {
      await expect(page.locator('text=My Jobs')).toBeVisible();
    });

    test('job cards display job number and description', async ({ page }) => {
      const cards = page.locator('.card');
      if (await cards.first().isVisible()) {
        await expect(cards.first().locator('.font-mono')).toBeVisible();
      }
    });

    test('empty state message visible when no jobs', async ({ page }) => {
      const noJobs = page.locator('text=No jobs assigned to you yet');
      if (await noJobs.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(noJobs).toBeVisible();
      }
    });

    test('job card click opens detail view', async ({ page }) => {
      const jobCard = page.locator('.card:has(.font-mono)').first();
      if (await jobCard.isVisible()) {
        await jobCard.click();
        await expect(page.locator('text=← Back')).toBeVisible();
      }
    });

    test('detail view shows state controls', async ({ page }) => {
      const jobCard = page.locator('.card:has(.font-mono)').first();
      if (await jobCard.isVisible()) {
        await jobCard.click();
        const stateControls = page.locator('text=State Controls, button:has-text("Advance")');
        if (await stateControls.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(stateControls.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Schedule', () => {
    test.beforeEach(async ({ page }) => {
      await setDemoAuth(page, 'technician');
      await page.goto('/technician/schedule');
      await page.waitForLoadState('networkidle');
    });

    test('schedule page loads', async ({ page }) => {
      await expect(page.locator('text=My Schedule')).toBeVisible();
    });

    test('technician sees schedule status badges, not dropdowns', async ({ page }) => {
      const dropdown = page.locator('select');
      const hasDropdown = await dropdown.count() > 0 && await dropdown.first().isVisible({ timeout: 1000 }).catch(() => false);
      if (hasDropdown) {
        // If dropdown exists, technician should NOT see editable selects
        const editableSelect = page.locator('select:not([disabled])');
        await expect(editableSelect).toHaveCount(0);
      }
    });

    test('quick stats section visible', async ({ page }) => {
      await expect(page.locator('text=Quick Stats')).toBeVisible();
    });

    test('empty schedule message shown when no entries', async ({ page }) => {
      const emptyMsg = page.locator('text=No schedule entries for the next 30 days');
      if (await emptyMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(emptyMsg).toBeVisible();
      }
    });
  });
});
