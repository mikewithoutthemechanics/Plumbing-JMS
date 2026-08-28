import { test as base, expect, type Page } from '@playwright/test';

// Re-export everything from the base test
export { expect };

// Constants for dev/demo mode auth
const DEV_ADMIN_COOKIE = 'dev_admin';
const DEV_AUTH_STORAGE = 'devAuth';

const DEV_AUTH_JSON = JSON.stringify({
  user: {
    id: 'test-user-id',
    email: 'test@agentcy.co.za',
    user_metadata: { full_name: 'Test Owner' },
  },
  role: 'owner',
});

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Set the dev_admin cookie so middleware allows access
    await page.context().addCookies([
      {
        name: DEV_ADMIN_COOKIE,
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Set devAuth in localStorage so dashboard layout renders nav
    await page.goto('/');
    await page.evaluate((val) => {
      localStorage.setItem('devAuth', val);
    }, DEV_AUTH_JSON);

    await use(page);
  },
});

export { base as rawTest };
