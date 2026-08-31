import { test, expect } from '@playwright/test';
const BASE = 'https://plumbing-jms.vercel.app';

test('Login page loads with email input', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
});

test('Login page has magic link button', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('button:has-text("magic link"), button:has-text("Magic Link")')).toBeVisible();
});

test('Login page has Google OAuth button', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('button:has-text("Google"), button:has-text("google")')).toBeVisible();
});

test('API /api/jobs requires auth (401)', async ({ request }) => {
  const res = await request.get(`${BASE}/api/jobs`);
  expect(res.status()).toBe(401);
});

test('API /api/quotes requires auth (401)', async ({ request }) => {
  const res = await request.get(`${BASE}/api/quotes`);
  expect(res.status()).toBe(401);
});

test('API /api/staff requires auth (401)', async ({ request }) => {
  const res = await request.get(`${BASE}/api/staff`);
  expect(res.status()).toBe(401);
});

test('API /api/export requires auth (401)', async ({ request }) => {
  const res = await request.get(`${BASE}/api/export`);
  expect(res.status()).toBe(401);
});

test('Profile setup page loads', async ({ page }) => {
  await page.goto(`${BASE}/profile-setup`);
  await expect(page.locator('input[name="fullName"], input[name="full_name"]')).toBeVisible();
});
