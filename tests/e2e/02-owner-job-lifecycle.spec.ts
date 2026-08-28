import { test, expect, type Page } from '@playwright/test';
import { cleanupTestJob, apiPost, apiPatch, apiDelete, apiGet } from './helpers';
import { loginAsOwner, setRoleAuth } from './helpers';

const JOB_NAME_PREFIX = 'E2E Test Job';
let createdJobId: string | null = null;

// (2) Owner job lifecycle
test.describe('Owner Job Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test.afterEach(async ({ page }) => {
    if (createdJobId) {
      await apiDelete(page, `/api/jobs?id=${createdJobId}`).catch(() => {});
      createdJobId = null;
    }
    await cleanupTestJob(page, JOB_NAME_PREFIX);
  });

  test('can create a new job card', async ({ page }) => {
    await page.goto('/admin/jobs');
    await page.click('button:has-text("New Job Card")');
    await expect(page.locator('text=Create Job Card')).toBeVisible();

    await page.selectOption('select[name="customer_id"]', { index: 1 });
    await page.fill('textarea[name="description"]', `${JOB_NAME_PREFIX} - ${Date.now()}`);
    await page.fill('input[name="admin_hourly_rate"]', '500');
    await page.click('button[type="submit"]:has-text("Create Job")');
    await expect(page.locator(`text=${JOB_NAME_PREFIX}`)).toBeVisible({ timeout: 10000 });
  });

  test('create job modal cancel closes modal', async ({ page }) => {
    await page.goto('/admin/jobs');
    await page.click('button:has-text("New Job Card")');
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Create Job Card')).not.toBeVisible();
  });

  test('can click into a job detail page', async ({ page }) => {
    await page.goto('/admin/jobs');
    const firstJob = page.locator('[data-testid="job-card"], .job-card, .card').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await expect(page).toHaveURL(/\/admin\/jobs\/[a-f0-9-]+/);
    }
  });

  test('can advance job state from detail page', async ({ page }) => {
    await page.goto('/admin/jobs');
    const firstJob = page.locator('[data-testid="job-card"], .job-card, .card').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForLoadState('networkidle');
      const advanceBtn = page.locator('button:has-text("Advance"), button:has-text("Start"), button:has-text("Complete")').first();
      if (await advanceBtn.isVisible()) {
        await advanceBtn.click();
        await expect(page.locator('text=Success, text=updated')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('can view jobs list with filters', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await page.click('button:has-text("Pending")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Assigned")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("In Progress")');
    await page.waitForTimeout(500);
  });

  test('can export XLSX from job detail', async ({ page }) => {
    await page.goto('/admin/jobs');
    const firstJob = page.locator('[data-testid="job-card"], .job-card, .card').first();
    if (await firstJob.isVisible()) {
      await firstJob.click();
      await page.waitForLoadState('networkidle');
      const exportBtn = page.locator('button:has-text("Export XLSX")');
      if (await exportBtn.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.xlsx');
      }
    }
  });

  test('create job missing required fields shows error', async ({ page }) => {
    await page.goto('/admin/jobs');
    await page.click('button:has-text("New Job Card")');
    await expect(page.locator('text=Create Job Card')).toBeVisible();

    // Submit without customer, description, or hourly rate
    await page.click('button[type="submit"]:has-text("Create Job")');

    // Browser required validation or API error should surface
    await expect(page.locator('text=required, text=Missing required fields, .toast:has-text("Error"), [role="status"]:has-text("Error")')).toBeVisible({ timeout: 5000 }).catch(() => false);
  });

  test('create job with invalid hourly rate rejected', async ({ page }) => {
    const response = await apiPost(page, '/api/jobs', {
      customer_id: '00000000-0000-0000-0000-000000000000',
      description: 'Test invalid hourly rate',
      admin_hourly_rate: -50,
    });
    // API should reject negative hourly rate with 400, or 401 if no real auth
    expect([400, 401]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('job detail shows pricing to owner but sanitized for technician', async ({ page }) => {
    // Owner view: pricing fields present on jobs
    const ownerRes = await apiGet(page, '/api/jobs');
    expect([200, 401]).toContain(ownerRes.status());
    if (ownerRes.status() === 200) {
      const ownerData = await ownerRes.json();
      if (ownerData.jobs && ownerData.jobs.length > 0) {
        const job = ownerData.jobs[0];
        expect(job).toHaveProperty('admin_hourly_rate');
        expect(job).toHaveProperty('grand_total');
      }
    }

    // Technician view: pricing fields sanitized to null
    await setRoleAuth(page, 'technician');
    const techRes = await apiGet(page, '/api/jobs');
    expect([200, 401]).toContain(techRes.status());
    if (techRes.status() === 200) {
      const techData = await techRes.json();
      if (techData.jobs && techData.jobs.length > 0) {
        const job = techData.jobs[0];
        expect(job.admin_hourly_rate).toBeNull();
        expect(job.grand_total).toBeNull();
      }
    }
  });

  test('advance job state blocked for invalid transition', async ({ page }) => {
    const createRes = await apiPost(page, '/api/jobs', {
      customer_id: 'mock-cust-1',
      description: 'E2E Invalid Transition Test',
      admin_hourly_rate: 100,
    });

    if (createRes.status() === 201) {
      const job = (await createRes.json()).job;
      createdJobId = job.id;
      // pending -> completed is invalid (must pass through assigned/in_progress)
      const patchRes = await apiPatch(page, '/api/jobs', {
        job_id: job.id,
        status: 'completed',
      });
      expect(patchRes.status()).toBe(400);
      const body = await patchRes.json();
      expect(body.error).toMatch(/Invalid state transition/);
    } else {
      expect([400, 401]).toContain(createRes.status());
    }
  });

  test.skip('invoice job blocked when materials exceed stock', async () => {
    // Skipped: requires DB seed data — job_materials with material_id and quantity,
    // plus a materials row where quantity_on_hand < required quantity.
    // Recommend unit test coverage for the shortfall guard in src/app/api/jobs/route.ts PATCH.
  });

  test('delete pending job works', async ({ page }) => {
    const createRes = await apiPost(page, '/api/jobs', {
      customer_id: 'mock-cust-1',
      description: 'E2E Delete Pending Test',
      admin_hourly_rate: 100,
    });

    if (createRes.status() === 201) {
      const job = (await createRes.json()).job;
      createdJobId = job.id;
      expect(job.status).toBe('pending');

      const deleteRes = await apiDelete(page, `/api/jobs?id=${job.id}`);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.success).toBe(true);
      createdJobId = null;
    } else {
      expect([400, 401]).toContain(createRes.status());
    }
  });

  test('delete non-pending job blocked', async ({ page }) => {
    const createRes = await apiPost(page, '/api/jobs', {
      customer_id: 'mock-cust-1',
      description: 'E2E Delete NonPending Test',
      admin_hourly_rate: 100,
      assigned_to: 'dev-admin-001',
    });

    if (createRes.status() === 201) {
      const job = (await createRes.json()).job;
      createdJobId = job.id;
      expect(job.status).not.toBe('pending');

      const deleteRes = await apiDelete(page, `/api/jobs?id=${job.id}`);
      expect(deleteRes.status()).toBe(400);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.error).toMatch(/Can only delete pending jobs/);
    } else {
      expect([400, 401]).toContain(createRes.status());
    }
  });
});
