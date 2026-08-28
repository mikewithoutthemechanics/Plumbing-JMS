import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  testMatch: '**/*.spec.ts',
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText('hello')`;
     */
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    /**
     * Base URL to use in actions like `await page.goto('/')`.
     */
    baseURL: 'https://plumbing-jms.vercel.app',

    /**
     * Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
     */
    trace: 'on-first-retry',
  },

  /**
   * Configure for your major deployment endpoint.
   * Here's a Chrome Server on Windows.
   * More details: https://playwright.dev/docs/test-cloud-services
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});