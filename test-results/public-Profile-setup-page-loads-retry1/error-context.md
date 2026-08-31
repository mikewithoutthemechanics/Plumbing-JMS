# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public.spec.ts >> Profile setup page loads
- Location: tests\e2e\public.spec.ts:39:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="fullName"], input[name="full_name"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[name="fullName"], input[name="full_name"]')

```

```yaml
- img
- heading "Punctual Plumbers" [level=1]
- paragraph: Sign in to your workspace
- text: Email
- textbox
- text: Password
- textbox
- button "Sign In"
- text: or
- button "Send magic link instead"
- button "Continue with Google"
- button "Don't have an account? Sign up"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | const BASE = 'https://plumbing-jms.vercel.app';
  3  | 
  4  | test('Login page loads with email input', async ({ page }) => {
  5  |   await page.goto(`${BASE}/login`);
  6  |   await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  7  | });
  8  | 
  9  | test('Login page has magic link button', async ({ page }) => {
  10 |   await page.goto(`${BASE}/login`);
  11 |   await expect(page.locator('button:has-text("magic link"), button:has-text("Magic Link")')).toBeVisible();
  12 | });
  13 | 
  14 | test('Login page has Google OAuth button', async ({ page }) => {
  15 |   await page.goto(`${BASE}/login`);
  16 |   await expect(page.locator('button:has-text("Google"), button:has-text("google")')).toBeVisible();
  17 | });
  18 | 
  19 | test('API /api/jobs requires auth (401)', async ({ request }) => {
  20 |   const res = await request.get(`${BASE}/api/jobs`);
  21 |   expect(res.status()).toBe(401);
  22 | });
  23 | 
  24 | test('API /api/quotes requires auth (401)', async ({ request }) => {
  25 |   const res = await request.get(`${BASE}/api/quotes`);
  26 |   expect(res.status()).toBe(401);
  27 | });
  28 | 
  29 | test('API /api/staff requires auth (401)', async ({ request }) => {
  30 |   const res = await request.get(`${BASE}/api/staff`);
  31 |   expect(res.status()).toBe(401);
  32 | });
  33 | 
  34 | test('API /api/export requires auth (401)', async ({ request }) => {
  35 |   const res = await request.get(`${BASE}/api/export`);
  36 |   expect(res.status()).toBe(401);
  37 | });
  38 | 
  39 | test('Profile setup page loads', async ({ page }) => {
  40 |   await page.goto(`${BASE}/profile-setup`);
> 41 |   await expect(page.locator('input[name="fullName"], input[name="full_name"]')).toBeVisible();
     |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  42 | });
  43 | 
```