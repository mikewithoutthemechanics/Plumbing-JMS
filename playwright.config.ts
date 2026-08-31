import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://plumbing-jms.vercel.app',
    headless: true,
    screenshot: 'only-on-failure',
  },
});
