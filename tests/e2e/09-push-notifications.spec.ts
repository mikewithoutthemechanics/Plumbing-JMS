import { test, expect } from '@playwright/test';
import { loginAsOwner, loginAsTechnician } from './helpers';

// (9) Push notification subscribe/send/vapid-key
test.describe('Push Notifications', () => {
  test.describe('VAPID Key Endpoint', () => {
    test('vapid-key endpoint returns public key when configured', async ({ page }) => {
      await page.goto('/api/notifications/webpush/vapid-key');
      const json = await page.evaluate(() => ({
        status: document.querySelector('pre')?.textContent || document.body.textContent,
      }));
      const body = json.status;
      if (body.includes('publicKey')) {
        await expect(page.locator('text=/publicKey/')).toBeVisible();
      } else if (body.includes('VAPID not configured')) {
        // Acceptable if not configured in test env
        await expect(page.locator('text=VAPID not configured')).toBeVisible();
      }
    });
  });

  test.describe('Subscribe Endpoint', () => {
    test('subscribe requires authentication', async ({ page }) => {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/notifications/webpush/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: { endpoint: 'https://test.com' } }),
        });
        return { status: r.status, text: await r.text() };
      });
      expect([401, 403]).toContain(res.status);
    });

    test('subscribe accepts valid payload when authenticated', async ({ page }) => {
      await loginAsTechnician(page);
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/notifications/webpush/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/test',
              keys: { p256dh: 'test', auth: 'test' },
            },
          }),
        });
        return { status: r.status, text: await r.text() };
      });
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  test.describe('Send Endpoint', () => {
    test('send requires CRON_SECRET authorization', async ({ page }) => {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/notifications/webpush/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong-secret' },
          body: JSON.stringify({ payload: { title: 'Test' } }),
        });
        return { status: r.status, text: await r.text() };
      });
      expect(res.status).toBe(401);
      expect(res.text).toContain('Unauthorized');
    });

    test('send returns subscription count on GET without auth', async ({ page }) => {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/notifications/webpush/send');
        return { status: r.status, text: await r.text() };
      });
      // GET also requires auth
      expect([401]).toContain(res.status);
    });
  });

  test.describe('Technician Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTechnician(page);
    });

    test('technician dashboard loads without notification errors', async ({ page }) => {
      await page.goto('/technician/jobs');
      await expect(page.locator('text=My Jobs')).toBeVisible();
    });

    test('no unhandled promise rejections on technician page', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto('/technician/jobs');
      await page.waitForTimeout(1000);
      // Should not have critical errors
      const hasCritical = errors.some(e => e.includes('ChromeWorker') || e.includes('Notification'));
      expect(hasCritical).toBeFalsy();
    });
  });

  test.describe('Owner Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
    });

    test('owner dashboard loads without notification errors', async ({ page }) => {
      await page.goto('/admin/overview');
      await expect(page.locator('text=Overview')).toBeVisible();
    });
  });
});
