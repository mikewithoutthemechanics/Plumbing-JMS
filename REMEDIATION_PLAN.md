# Plumbing-JMS Remediation Plan (Findings #1–#11)

Coordinated multi-agent fix for the code review findings. Every agent must **validate with proof before editing** and **verify after applying** that the change exists, is correct, and works. No two agents edit the same file. Changes are committed to `STEVE-REVISION-18-08-26-pr` only after integration passes.

## Live tracking doc (monitor here)

**`REMEDIATION_TRACKER.md`** (repo root) is the append-only, real-time log the owner watches. Every agent and the QC agent record their work in it at each milestone. Entries are appended; never edited or deleted. After each agent finishes, the coordinator shows the tail of this file.

### Tracker entry format (append exactly this shape, replace `<...>`)

```
### [YYYY-MM-DD HH:MM:SS] <Agent N — name> — START
Phase: <A|B|C> | Files owned: <paths> | Depends on: <agent/file>

### [YYYY-MM-DD HH:MM:SS] <Agent N — name> — VALIDATED
Evidence (proof, from the before-state): <grep/read/SQL output summary, line numbers>

### [YYYY-MM-DD HH:MM:SS] <Agent N — name> — EDITED
Files touched: <path (new|modified|deleted)> | Change summary: <what & why>

### [YYYY-MM-DD HH:MM:SS] <Agent N — name> — VERIFIED
- tsc: <pass/fail> | eslint: <pass/fail> | npm test: <pass/fail, count>
- DB: <migration pushed / pg_policies / RLS sim result>
- Functional: <what was proven>
```

### QC verdict entry format

```
### [YYYY-MM-DD HH:MM:SS] QC — REVIEW <Agent N — name> — <PASS|FAIL>
Scope check: <per owned-file result> | Overlap check: <none found / list> | Evidence check: <ok / missing>
Findings: <list or "none">
```

## Global rules for all agents

- Shell is **Windows PowerShell 5.1**: use `;` not `&&`.
- **Mandatory:** append a tracker entry (format above) at each milestone — START, VALIDATED, EDITED, VERIFIED. Never touch `REMEDIATION_TRACKER.md` except to append your own entries; never edit/delete any entry.
- Next.js in this repo is **NOT the Next.js from training data** (`next@16.2.11`). Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices (see AGENTS.md).
- Before editing a file, read it and record the current relevant lines as proof.
- After editing: run `npx tsc --noEmit`, then `npm run lint` on the files you changed (eslint 9: `npx eslint <files>`), then `npm test` for any affected test files. Report each command's output.
- Do NOT commit, push, or deploy. The coordinator owns integration, commit, and deploy.
- Do NOT touch `src/lib/supabase/server.ts` except Agent 5.
- Do NOT touch `supabase/migrations/` except Agents 1 and 5 (each owns its own new file, never a shared one).

## Sequencing

```
Phase A  : Agent 1 (DB hardening migration)  ->  Agent 5 (server client + RLS additions migration)
QC GATE 1: QC agent reviews Phase A against scope
Phase B  : Agents 2, 3, 4 in parallel  (disjoint file sets)
QC GATE 2: QC agent reviews Phase B against scope
Phase C  : Coordinator integration: typecheck, lint, test, build, deploy, live verification
QC GATE 3: QC agent final review before commit/push
```

Phase B may start as soon as Agent 1's migration is pushed (Agents 2/4 depend on DB state: RPC + time_logs policy). Agent 5 must run after Agent 1 (both touch RLS; Agent 5 adds new policies only). Agent 3 is independent of DB changes.

## Quality Control agent (QC)

A dedicated read-only QC agent reviews work at each gate. It **does not fix code** — it verifies and reports PASS/FAIL.

**Inputs:** this plan, `REMEDIATION_TRACKER.md`, and git/file evidence.

**Checks at each gate:**
1. **Scope compliance** — for every changed/new/deleted file, confirm it is inside the owning agent's file list from the plan. Flag any out-of-scope file.
2. **No overlap** — confirm no file was touched by more than one agent (cross-check tracker EDITED entries and `git status`/`git diff --name-only`).
3. **Evidence present** — confirm the agent recorded VALIDATED and VERIFIED entries with concrete proof (grep/read output, tsc/eslint/test results, pg_policies/RLS simulation, `db push`).
4. **Spot verification** — re-run `npx tsc --noEmit` and `npm test` (or targeted eslint) to independently confirm the agent's claims; verify DB state (policies, functions) matches the agent's report.
5. **Finding completeness** — confirm every scope item assigned to that agent from the findings list was actually addressed, with nothing silently dropped.

**Output:** append a QC verdict entry to `REMEDIATION_TRACKER.md` for each reviewed agent. On FAIL, list the exact gaps; the owning agent re-runs to fix and re-verifies, then QC re-reviews. Phase transitions only happen on PASS.

---

## Phase A

### Agent 1 — DB hardening (OWNER: `supabase/migrations/20260820170000_harden_rls.sql`)

**Validates before** (proof required): run the `pg_policies` query and show the `USING(true)` rows for DELETE/UPDATE on `customers, materials, job_cards, job_materials, time_logs, banking_details, quotes, suppliers, sync_queue`, and the absence of a technician UPDATE policy on `time_logs`.

**Changes (single new migration file only):**
1. Replace every `FOR DELETE USING (true)` policy on the tables above with owner-role checks, e.g. `USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))`. Use `DROP POLICY IF EXISTS` then `CREATE POLICY` with the same names.
2. Replace every `FOR UPDATE USING (true)` policy on `quotes`, `suppliers`, `sync_queue` with the same owner-role check in `USING` (keep the existing `WITH CHECK`).
3. Add `Technician update own time_logs`: `FOR UPDATE USING (technician_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician')) WITH CHECK (technician_id = auth.uid())` — fixes technician clock-out (finding #1, DB side).
4. Add an atomic payment RPC for finding #11 (lost-update race in invoices):
   - `public.record_payment(invoice_id uuid, amount numeric, method text, note text, user_id uuid)`
   - Inside one transaction: `UPDATE public.invoices SET amount_paid = amount_paid + amount, status = CASE WHEN amount_paid + amount >= amount_due THEN 'paid' WHEN amount_paid + amount > 0 THEN 'partial' ELSE 'unpaid' END, paid_at = CASE WHEN amount_paid + amount >= amount_due THEN now() ELSE paid_at END WHERE id = invoice_id RETURNING *`, then insert into `public.payments`. SECURITY INVOKER, pinned `SET search_path = ''`.
   - Do NOT add RLS policies here (Agent 5 owns new policies).

**Verifies after** (proof required): `npx supabase db push`; re-run the `pg_policies` query and show no `USING (true)` remains for DELETE/UPDATE on the listed tables; show the new `time_logs` technician UPDATE policy and the `record_payment` function exist (`\df public.record_payment` or `SELECT proname FROM pg_proc`). Simulate RLS with `SET ROLE authenticated; SET request.jwt.claims = '{"sub":"<tech-uuid>","role":"authenticated"}'` to prove a technician can UPDATE their own `time_logs` and CANNOT DELETE `customers`.

### Agent 5 — Server client + RLS additions (OWNER: `src/lib/supabase/server.ts`, `supabase/migrations/20260820170010_rls_for_server_client.sql`)

**Validates before** (proof required): read `src/lib/supabase/server.ts`; list the ~30 call sites of `getSupabaseServerClient` (`grep -rn getSupabaseServerClient src`); run `pg_policies` and show which tables lack technician/accountant SELECT policies (esp. `customers`, `profiles` for joins).

**Changes:**
1. `getSupabaseServerClient()` → build with the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) so RLS is enforced for server pages/API routes. Keep the SSR cookie handling identical. Add a separate `getSupabaseServerClientServiceRole()` (or reuse existing `getSupabaseAdminClient`) for privileged calls — do not change `getSupabaseAdminClient()`.
2. New migration file adding the SELECT policies the anon-key client needs so nothing breaks (new policy names, no overlap with Agent 1):
   - `Technician select customers` (technicians see customers attached to their jobs; safe scope: any customer — matches current technician jobs join behavior).
   - `Technician select assigned profiles` — technicians can read `full_name, email` of profiles linked to their assigned jobs (for `assigned_to_profile` joins).
   - Verify `Accountant select customers` already exists (it does) — do not recreate.
3. Audit every `getSupabaseServerClient` call site and adjust queries only where RLS now filters data that the page legitimately needs, keeping existing in-app role checks as the primary gate. Record each file+query adjusted.

**Verifies after** (proof required): `npx supabase db push` for the new migration; re-run `pg_policies` showing the new policies; `npx tsc --noEmit`; `npx eslint src/lib/supabase/server.ts`; run `npm test`. Report the full call-site audit table (file → query → RLS policy that permits it).

---

## Phase B (parallel — disjoint files)

### Agent 2 — API security routes (OWNER: `src/middleware.ts`, `src/app/api/auth/magic-link/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/audit/route.ts`, `src/app/api/sync/route.ts`, `src/app/api/invoices/route.ts`)

**Validates before** (proof required): read each owned route; show the current magic-link `create_user: true` line, the notifications `POST` rate-limit-only check, the audit `changed_by || user.id` line, the sync `job_materials` `payload.id` bug line, and the invoices read-modify-write block.

**Changes:**
1. **magic-link**: rate-limit keyed by email+IP (`checkRateLimit`), set `create_user: false` so magic links only work for existing staff, and return a generic success response (no user enumeration).
2. **notifications POST**: require an authenticated session (`getUser()` must return a user) before processing. Keep the existing IP rate limit. GET stays CRON_SECRET-gated.
3. **audit**: ignore client-supplied `changed_by` and `ip_address`; always use the session `user.id` and derive IP from request headers.
4. **sync**: fix the `job_materials` UPDATE ownership check — for UPDATE/DELETE look up the `job_materials` row by `payload.id` to get its real `job_card_id`, then verify the job is assigned to the caller. For INSERT validate `job_card_id` directly. Also restrict the writable payload columns per table (allowlist) to stop arbitrary-column inserts. Preserve the existing 409 conflict logic.
5. **invoices PATCH**: replace the read-modify-write payment block with a call to `public.record_payment` (created by Agent 1). Keep input validation.
6. **middleware**: add guard — `role === 'technician'` reaching `/accountant*` redirects to `/technician/jobs`. Leave all existing guards and the `/api/*` passthrough intact.

**Verifies after** (proof required): `npx tsc --noEmit`; `npx eslint <changed files>`; `npm test`; and functional checks: `POST /api/notifications` without a session → 401; magic-link with unknown email → generic 200/400 without revealing existence; `PATCH /api/invoices` still records payment correctly (unit/integration test using mocked admin client).

### Agent 3 — Dead data layer removal (OWNER: `src/lib/hooks/*` (17 unused hooks + their tests), `src/lib/db/dexie.ts`, `src/components/offline-indicator/OfflineIndicator.tsx` + `.test.tsx` + `.stories.tsx`, `package.json`)

**Validates before** (proof required): grep each hook name and confirm zero imports outside `src/lib/hooks/` and `src/lib/supabase/services.ts`; confirm `OfflineIndicator` is mounted nowhere (grep shows only its own test/stories); confirm `queueSync` is never called; confirm `getPendingSyncItems` is only imported by `OfflineIndicator`.

**Changes:**
1. Delete the 17 unused hooks (keep `useJobs.ts` + `useJobs.test.ts` — still consumed by `JobsList`).
2. Delete the non-functional offline layer: `src/lib/db/dexie.ts`, `OfflineIndicator.tsx`, its test, and its story. Remove `dexie` from `package.json` dependencies.
3. Leave `src/lib/supabase/services.ts`, `src/app/providers.tsx`, and `src/components/jobs-list/JobsList.tsx` untouched.

**Verifies after** (proof required): `npx tsc --noEmit` (no dangling imports); `grep` proof that no remaining file imports a deleted hook or `dexie`/`OfflineIndicator`; `npm test` (remaining tests pass); report the exact list of files deleted.

### Agent 4 — Dashboard + technician time page (OWNER: `src/app/(dashboard)/admin/overview/page.tsx`, `src/app/(dashboard)/admin/overview/page.client.tsx`, `src/app/(dashboard)/technician/time/page.tsx`, `src/app/(dashboard)/technician/time/page.client.tsx`)

**Validates before** (proof required): read the overview page and show the `.limit(10)` slice feeding the counters; read the time page and show `log.job_id` (wrong key, schema column is `job_card_id`) and the derived `activeLog`.

**Changes:**
1. **Overview (#6)**: fetch real counts on the server page — separate `count` queries for total / `pending` / `to_be_invoiced` / `invoiced` — and pass them to the client as props. Keep the limit-10 recent-jobs list for display only. Update the realtime subscription handler in `page.client.tsx` to refetch the counts (not just the 10-row slice) and update the displayed numbers.
2. **Technician time (#1, client side)**: change `log.job_id` → `log.job_card_id`; derive the active log from the logs array (the row with no `clock_out`) instead of the broken `activeLog` lookup; make `clockOut` target the correct row; refresh logs after clock-in/out. Requires Agent 1's `time_logs` UPDATE policy to be live.

**Verifies after** (proof required): `npx tsc --noEmit`; `npx eslint <changed files>`; `npm test`; functional: overview counters match a manual SQL count; technician clock-out updates the row without an RLS error (tested against the live DB after Agent 1's push).

---

## Phase C — Coordinator integration

1. Run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` across the whole repo; fix only integration breakage.
2. `npx supabase db push` for any pending migrations (both new files already pushed by owners; verify list with `supabase list_migrations`).
3. **QC GATE 3** — QC agent performs a final full-scope review across all Phase A + Phase B changes before deploy (all five checks above, plus confirming Phase C integration fixes didn't introduce out-of-scope edits).
4. Deploy: `npx vercel --prod`.
5. Live verification: admin overview loads with correct counts; create a job as owner → assigned → email sent (already proven flow); technician clocks in and out successfully; `POST /api/notifications` returns 401 without a session; magic-link for unknown email does not create a user.
6. Append a final Phase C status entry to `REMEDIATION_TRACKER.md`.
7. Commit and push to `origin/STEVE-REVISION-18-08-26-pr` (coordinator only, after explicit user approval).

## Rollback

- DB: `npx supabase db push` was applied to a migration-tracked project; to roll back a migration, apply a corrective migration (do not rewrite history).
- App: revert the specific files per agent from git before the integration commit.
- `record_payment`: if the RPC changes break invoices, PATCH falls back to the old read-modify-write path only via revert of `api/invoices/route.ts`.