# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buttons-comprehensive.spec.ts >> Accountant Dashboard Buttons >> Debtors - Select Debtor navigates
- Location: tests\e2e\buttons-comprehensive.spec.ts:717:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * PRODUCTION-SAFE E2E SUITE.
  5   |  *
  6   |  * Runs against https://plumbing-jms.vercel.app (production data).
  7   |  * Rules this file follows:
  8   |  * - Real UI login per role (the old demo-mode bypass no longer exists;
  9   |  *   unauthenticated dashboard URLs 307-redirect to /login).
  10  |  * - All suite-owned rows contain "DELETE ME" in a name/description field and
  11  |  *   are removed in afterAll (best-effort, never fails the run).
  12  |  * - Destructive actions target ONLY fixtures created by this suite.
  13  |  * - Genuinely destructive/shared-state tests are test.skip()ed with reasons,
  14  |  *   never deleted.
  15  |  */
  16  | 
  17  | const BASE_URL = 'https://plumbing-jms.vercel.app';
  18  | 
  19  | // Production Supabase project. The anon key is publishable by design; it is
  20  | // only used to obtain a JWT via password grant and to manage suite fixtures.
  21  | const SUPABASE_URL = 'https://sunjjexcyfrlucitngwx.supabase.co';
  22  | const SUPABASE_ANON_KEY = 'sb_publishable_rrbQ_mpUhHWE0r1iUk6sPw_0ncDrW3i';
  23  | 
  24  | const TEST_CREDENTIALS = {
  25  |   owner: { email: 'e2e.owner@test.punctualplumbers.co.za', password: 'OwN3r-E2E-9xQ7!vLm2#Kp8Z' },
  26  |   technician: { email: 'e2e.technician@test.punctualplumbers.co.za', password: 'T3ch-E2E-4mW8@dRt5&Qs1Yb' },
  27  |   accountant: { email: 'e2e.accountant@test.punctualplumbers.co.za', password: 'AccT-E2E-7kP2$zNx9!Vm4Lo' },
  28  | };
  29  | type Role = keyof typeof TEST_CREDENTIALS;
  30  | 
  31  | const ROLE_LANDING: Record<Role, RegExp> = {
  32  |   owner: /\/admin\/overview/,
  33  |   technician: /\/technician\/jobs/,
  34  |   accountant: /\/accountant\/jobs/,
  35  | };
  36  | 
  37  | // Fixture names — every row this suite owns contains "DELETE ME" so afterAll
  38  | // (and any manual cleanup) can identify suite-owned rows.
  39  | const FIXTURE_CUSTOMER_NAME = 'E2E Fixture Customer - DELETE ME';
  40  | const FIXTURE_JOB_NAME = 'E2E Fixture Job - DELETE ME';
  41  | const FIXTURE_MATERIAL_NAME = 'E2E Fixture Material - DELETE ME';
  42  | const FIXTURE_QUOTE_NAME = 'E2E Fixture Quote - DELETE ME';
  43  | 
  44  | // Module state populated by beforeAll / in-test creates, consumed by afterAll.
  45  | let fixtureCustomerId: string | null = null;
  46  | let fixtureJobId: string | null = null;
  47  | let fixtureJobNumber: string | null = null;
  48  | let fixtureMaterialId: string | null = null;
  49  | let fixtureQuoteId: string | null = null;
  50  | const createdStaffEmails: string[] = [];
  51  | 
  52  | async function getOwnerToken(): Promise<string> {
  53  |   const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  54  |     method: 'POST',
  55  |     headers: {
  56  |       apikey: SUPABASE_ANON_KEY,
  57  |       'Content-Type': 'application/json',
  58  |     },
  59  |     body: JSON.stringify({
  60  |       email: TEST_CREDENTIALS.owner.email,
  61  |       password: TEST_CREDENTIALS.owner.password,
  62  |     }),
  63  |   });
  64  |   if (!res.ok) {
  65  |     throw new Error(`owner login failed: ${res.status} ${await res.text()}`);
  66  |   }
  67  |   const data = await res.json();
  68  |   return data.access_token as string;
  69  | }
  70  | 
  71  | function authedHeaders(token: string): Record<string, string> {
  72  |   return {
  73  |     apikey: SUPABASE_ANON_KEY,
  74  |     Authorization: `Bearer ${token}`,
  75  |     'Content-Type': 'application/json',
  76  |     Prefer: 'return=representation',
  77  |   };
  78  | }
  79  | 
  80  | async function login(page: Page, role: Role) {
  81  |   // Real UI login — the old demo-mode bypass no longer exists (unauthenticated
  82  |   // dashboard URLs 307-redirect to /login).
  83  |   // Selectors verified against src/app/(auth)/login/page.tsx: the form uses
  84  |   // bare input[type="email"] / input[type="password"] (no id/name attrs) and
  85  |   // button[type="submit"] ("Sign In"). Submit pushes to '/' which resolves to
  86  |   // the role landing page.
  87  |   const creds = TEST_CREDENTIALS[role];
  88  |   await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  89  |   await page.fill('input[type="email"]', creds.email);
  90  |   await page.fill('input[type="password"]', creds.password);
  91  |   await page.click('button[type="submit"]');
> 92  |   await page.waitForURL(ROLE_LANDING[role], { timeout: 45000 });
      |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  93  | }
  94  | 
  95  | async function openFixtureJobDetail(page: Page) {
  96  |   // Navigate to the first available job card on the jobs list page.
  97  |   // Job cards are rendered as card divs with cursor:pointer styling.
  98  |   await page.goto(`${BASE_URL}/admin/jobs`, { waitUntil: 'networkidle' });
  99  |   // Click the first card containing a job number pattern
  100 |   const jobCard = page.locator('.card').filter({ hasText: /JOB-|Assigned|Invoiced|Completed/ }).first();
  101 |   await expect(jobCard).toBeVisible({ timeout: 30000 });
  102 |   await jobCard.click();
  103 |   await expect(page).toHaveURL(/\/admin\/jobs\/[a-f0-9-]+/, { timeout: 30000 });
  104 | }
  105 | 
  106 | function fixtureMaterialRow(page: Page) {
  107 |   return page
  108 |     .locator('tbody tr, [data-testid="material-row"], .material-row', {
  109 |       hasText: FIXTURE_MATERIAL_NAME,
  110 |     })
  111 |     .first();
  112 | }
  113 | 
  114 | // App form fields carry no name/htmlFor attrs — locate the field that follows
  115 | // its <label> in document order. Labels are exact-matched, so 'Name' never
  116 | // collides with 'Full Name'.
  117 | function fieldByLabel(page: Page, label: string) {
  118 |   return page.locator(`//label[normalize-space()="${label}"]/following::input[1]`);
  119 | }
  120 | function selectByLabel(page: Page, label: string) {
  121 |   return page.locator(`//label[normalize-space()="${label}"]/following::select[1]`);
  122 | }
  123 | function areaByLabel(page: Page, label: string) {
  124 |   return page.locator(`//label[normalize-space()="${label}"]/following::textarea[1]`);
  125 | }
  126 | 
  127 | test.describe.configure({ retries: 1, timeout: 30000 });
  128 | 
  129 | test.beforeAll('create production-safe E2E fixtures via API', async () => {
  130 |   const token = await getOwnerToken();
  131 |   const headers = authedHeaders(token);
  132 | 
  133 |   // 1. Customer (the fixture job depends on this).
  134 |   const customerRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
  135 |     method: 'POST',
  136 |     headers,
  137 |     body: JSON.stringify({
  138 |       name: FIXTURE_CUSTOMER_NAME,
  139 |       email: `e2e-fixture-customer-${Date.now()}@test.invalid`,
  140 |       phone: '+27123456789',
  141 |       address: 'E2E Fixture Address - DELETE ME',
  142 |     }),
  143 |   });
  144 |   if (!customerRes.ok) {
  145 |     throw new Error(`fixture customer create failed: ${customerRes.status} ${await customerRes.text()}`);
  146 |   }
  147 |   const [customer] = await customerRes.json();
  148 |   fixtureCustomerId = customer.id as string;
  149 | 
  150 |   // 2. Material.
  151 |   const materialRes = await fetch(`${SUPABASE_URL}/rest/v1/materials`, {
  152 |     method: 'POST',
  153 |     headers,
  154 |     body: JSON.stringify({
  155 |       name: FIXTURE_MATERIAL_NAME,
  156 |       admin_unit_price: 10,
  157 |       quantity_on_hand: 100,
  158 |     }),
  159 |   });
  160 |   if (!materialRes.ok) {
  161 |     throw new Error(`fixture material create failed: ${materialRes.status} ${await materialRes.text()}`);
  162 |   }
  163 |   const [material] = await materialRes.json();
  164 |   fixtureMaterialId = material.id as string;
  165 | 
  166 |   // 3. Job on the fixture customer (description doubles as its display name).
  167 |   // Table is job_cards (not jobs); created_by is NOT NULL; owner id from /auth/v1/user.
  168 |   const meRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  169 |   if (!meRes.ok) {
  170 |     throw new Error(`owner user lookup failed: ${meRes.status} ${await meRes.text()}`);
  171 |   }
  172 |   const ownerId = ((await meRes.json()) as { id: string }).id;
  173 |   const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/job_cards`, {
  174 |     method: 'POST',
  175 |     headers,
  176 |     body: JSON.stringify({
  177 |       job_number: `E2E-${Date.now()}`,
  178 |       customer_id: fixtureCustomerId,
  179 |       description: FIXTURE_JOB_NAME,
  180 |       admin_hourly_rate: 100,
  181 |       status: 'pending',
  182 |       created_by: ownerId,
  183 |     }),
  184 |   });
  185 |   if (!jobRes.ok) {
  186 |     throw new Error(`fixture job create failed: ${jobRes.status} ${await jobRes.text()}`);
  187 |   }
  188 |   const [job] = await jobRes.json();
  189 |   fixtureJobId = job.id as string;
  190 |   fixtureJobNumber = (job.job_number ?? job.job_no ?? job.number ?? null) as string | null;
  191 | 
  192 |   // 4. Quote via the public API route (exercises the real endpoint).
```