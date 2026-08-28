# E2E Test Expansion — Findings and Recommendations

## 1. Files Edited

- `tests/e2e/03-technician-flows.spec.ts` — Fixed invalid `page.setDemoAuth('technician')` calls; replaced with `setDemoAuth(page, 'technician')` from helpers. Expanded coverage: profile setup dev-mode behavior, navigation role restrictions, time log UI states, materials form validation, assigned jobs detail view, and schedule read-only badges.
- `tests/e2e/04-accountant-flows.spec.ts` — Expanded with debtor list outstanding amounts, payment recording flow, exports page content verification, role restriction checks (cannot access /admin/* or /technician/*), and accountant jobs status filtering.
- `tests/e2e/08-whatsapp-reminder.spec.ts` — Expanded with owner config save, missing-config error simulation, accountant send-reminder via debtors, and role-based access restrictions.
- `tests/e2e/09-push-notifications.spec.ts` — Expanded with vapid-key endpoint, subscribe auth checks, send endpoint CRON_SECRET enforcement, and dashboard error-boundary validation.
- `tests/e2e/13-procurement.spec.ts` — Created new file covering owner/technician submission, invalid-item rejection, and accountant forbidden access.
- `tests/e2e/14-schedule.spec.ts` — Created new file covering owner edit availability, technician read-only badges, and accountant route restriction.

## 2. New Test Names

### 03-technician-flows.spec.ts
- dev mode shows unavailable message
- profile setup form fields exist
- continue button disabled when fields incomplete
- continue button enabled when fields complete
- can navigate to My Jobs
- can navigate to Time Log
- can navigate to Materials
- cannot access admin routes
- cannot access accountant routes
- time log page loads with active jobs section
- no active clock-in shows jobs as tappable
- clocked-in job shows stop indicator
- materials page loads with form
- cannot submit without selecting job
- job selector shows active jobs
- my jobs page loads
- job cards display job number and description
- empty state message visible when no jobs
- job card click opens detail view
- detail view shows state controls
- schedule page loads
- technician sees schedule status badges, not dropdowns
- quick stats section visible
- empty schedule message shown when no entries

### 04-accountant-flows.spec.ts
- can view debtors list with outstanding amounts
- debtor cards show name, outstanding, and open invoices
- can select debtor and view invoices
- can record payment on debtor
- can navigate to exports
- exports page shows invoiced jobs
- export download not available via UI
- can navigate to job cards
- accountant jobs only show completed or invoiced
- accountant cannot access admin routes
- accountant cannot access technician routes
- accountant cannot send WhatsApp config (owner only)
- accountant can send WhatsApp reminder via debtors

### 08-whatsapp-reminder.spec.ts
- can view WhatsApp settings page
- can save WhatsApp settings
- accountant cannot access WhatsApp settings
- can send WhatsApp reminder from job detail
- missing config returns error when sending reminder
- accountant can send WhatsApp reminder from debtors
- accountant cannot configure WhatsApp settings
- technician cannot send WhatsApp reminders
- technician cannot access WhatsApp settings

### 09-push-notifications.spec.ts
- vapid-key endpoint returns public key when configured
- subscribe requires authentication
- subscribe accepts valid payload when authenticated
- send requires CRON_SECRET authorization
- send returns subscription count on GET without auth
- technician dashboard loads without notification errors
- no unhandled promise rejections on technician page
- owner dashboard loads without notification errors

### 13-procurement.spec.ts
- can submit procurement request with valid items
- invalid items are rejected
- technician can access procurement page
- technician cannot access admin procurement
- accountant cannot access procurement

### 14-schedule.spec.ts
- can view technician schedule
- owner can set availability for technician
- owner sees quick stats
- technician can view own schedule
- technician cannot edit schedule (read-only)
- technician sees status badges not dropdowns
- accountant cannot access schedule

## 3. Skipped / Blocked Tests (with reasons)

| Test | Reason |
|------|--------|
| Profile setup redirect for incomplete technician | `src/app/(dashboard)/profile-setup/page.tsx` returns "Profile setup unavailable in dev mode." when `dev_admin` cookie is set. Real redirect only occurs in production auth flow. |
| Export download trigger | `src/app/(dashboard)/accountant/exports/page.tsx` renders a static list with totals. No download/export button or CSV generation endpoint exists in the UI. |
| Procurement page UI interactions | No dedicated `/admin/procurement` or `/technician/procurement` page component was found; tests validate API auth boundaries and fallback to UI presence checks. |
| Public quotes flow | No public quotes route exists; all quote functionality is under `/admin/quotes` (owner-only). |

## 4. CI Workflow Recommendation

**Do not create the file unless explicitly instructed.**

Recommended `.github/workflows/playwright.yml` configuration:

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run Playwright tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' }}
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Key points:
- Matrix is single-chromium to reduce flakiness and cost.
- `PLAYWRIGHT_BASE_URL` is injected from secrets so tests can run against staging.
- `forbidOnly` and `retries` are already handled by the Playwright config under `CI`.
- Browsers installed with `--with-deps` to avoid missing lib issues on Ubuntu.

## 5. Playwright Config Recommendation

**Current state:** `playwright.config.ts` hardcodes `baseURL: 'https://plumbing-jms.vercel.app'`.

**Recommendation:** Make `baseURL` overridable via the `PLAYWRIGHT_BASE_URL` environment variable so local and CI runs can target different environments without editing config.

```ts
// playwright.config.ts
export default defineConfig({
  // ...
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // ...
});
```

Rationale:
- Developers run the app on `localhost:3000`; CI may run against a preview or staging URL.
- Hardcoding the production URL makes local debugging harder (tests will fail if the app isn't deployed).
- The `helpers.ts` file already reads `PLAYWRIGHT_BASE_URL` for `BASE_URL`, but the Playwright config itself does not — aligning them removes inconsistency.
