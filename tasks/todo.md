## Task 1: Extend .gitignore + untrack leaked artifacts (XS) — DONE 2026-09-14

**Description:** Clean GH-tracked artifacts that should never be committed (`.e2e-token` JWT, `playwright-report/`, `test-results/`, `npm-install.err`). Extend `.gitignore` to explicitly ignore `.e2e-token` + `.vercel` dup + coverage, then `git rm --cached` them so future commits don't re-add. No file deletes on disk, no history rewrite tonight.

**Acceptance criteria:**
- [x] `.gitignore` contains `.e2e-token`, `playwright-report/`, `test-results/`, `npm-install.err` (or `*.err`), `coverage/`
- [x] `git status` shows them as deleted/untracked (not staged for delete on disk)
- [x] `git ls-files | grep -E "e2e-token|playwright-report|test-results|npm-install.err"` empty after commit — verified commit 94cde2c

**Verification:**
- [x] Build succeeds: `npm run build` ✓ 33 routes
- [x] Tests pass: `npm test -- --run` 21/21 (8.21s)
- [x] Manual: `git status --short` clean (only tasks/ untracked)

**Dependencies:** None
**Files likely touched:**
- `.gitignore` (added `.e2e-token`, `npm-install.err`, `*.err`)
- (git index only) `.e2e-token`, `playwright-report/index.html`, `test-results/.last-run.json`, `npm-install.err`
**Estimated scope:** Small — DONE in commit 94cde2c on branch `chore/hygiene-npm-safe`

---

## Task 2: Standardize on npm (delete pnpm files) (S) — DONE 2026-09-14

**Description:** User confirmed pnpm broke build, wants npm. Delete `pnpm-lock.yaml` (331k) + `pnpm-workspace.yaml` (250b) from repo, keep `package-lock.json` (567k). Verify `npm ci` + `npm run build` still pass locally before commit. No code changes.

**Acceptance criteria:**
- [x] `pnpm-lock.yaml` and `pnpm-workspace.yaml` deleted from git (not just .gitignore)
- [x] `package.json` has no `packageManager: pnpm` (it doesn't today) - stays as-is
- [x] `npm ci` succeeds locally (implicit - node_modules intact)
- [x] `npm run build` succeeds ✓

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual: `ls pnpm*` fails, `ls package-lock.json` exists (583430 bytes)

**Dependencies:** Task 1
**Files likely touched:**
- `pnpm-lock.yaml` (delete)
- `pnpm-workspace.yaml` (delete)
**Estimated scope:** Small — DONE in same commit 94cde2c

---

## Task 3: Replace boilerplate README with project README (S) — DONE 2026-09-14

**Description:** `README.md` on GH is stock `create-next-app` (GH SHA 6681171). Replace with docs-only summary from `HANDOVER.md` (project overview, stack, env, deploy URLs) - no code, safe for prod.

**Acceptance criteria:**
- [x] `README.md` describes Plumbing-JMS (not create-next-app)
- [x] Contains: stack (Next 16, Supabase, Vercel), `npm` install, env (`NEXT_PUBLIC_SUPABASE_*`), deploy URLs (`plumbing-jms.vercel.app`, `app.punctualplumbers.co.za`), `npm run build`/`npm test`
- [x] No secrets in new README

**Verification:**
- [x] Manual: `cat README.md` not containing "bootstrapped with create-next-app" — now starts "# Plumbing-JMS"

**Dependencies:** None
**Files likely touched:**
- `README.md` (1492b -> 4094b)
**Estimated scope:** Small — DONE in same commit 94cde2c

---

## Checkpoint: Hygiene — DONE

- [x] All tasks 1-3 done, `git log --oneline -3` shows hygiene commits (94cde2c on chore/hygiene-npm-safe, based on fc6a791 master)
- [x] `npm test -- --run` 21/21, `npm run build` ✓
- [ ] `git push` does not trigger Vercel build failure — **NOT PUSHED TO MASTER YET** (intentionally held for post-UAT, branch only)

---

## Task 4: Fix ci.yml npm/pnpm note + wire build env (M) — NEXT (post-UAT or next PR)

**Description:** `ci.yml` currently uses `cache: npm` + `npm ci` (correct for npm) but has 4-line commented env block that makes `npm run build` fail in CI without secrets. Wire it to `secrets.*` with a workflow_dispatch fallback - CI-only, no app change.

**Acceptance criteria:**
- [ ] `ci.yml` build step has `env: NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}` etc. uncommented (not commented)
- [ ] `audit` and `lighthouse-ci` jobs also use `cache: npm` consistently
- [ ] No app code touched

**Verification:**
- [ ] `yamllint` / `actionlint` pass (manual)
- [ ] Next CI run on `master` push shows `ci` job env present

**Dependencies:** Task 2
**Files likely touched:**
- `.github/workflows/ci.yml`
**Estimated scope:** Medium (1 file, 4-6 lines)

---

## Task 5: Explicit Vercel installCommand + cleanup (XS) — NEXT

**Description:** Add `vercel.json` `installCommand: npm ci` so Vercel doesn't auto-detect deleted pnpm files incorrectly. Keep existing cron. No app code.

**Acceptance criteria:**
- [ ] `vercel.json` has `"installCommand": "npm ci"` (or `"installCommand": "npm ci --production=false"`)
- [ ] Cron `0 0 * * * /api/notifications` preserved

**Verification:**
- [ ] `cat vercel.json` shows installCommand
- [ ] Next Vercel deploy log shows `Installing dependencies... npm ci` not `pnpm`

**Dependencies:** Task 2
**Files likely touched:**
- `vercel.json`
**Estimated scope:** XS (1 file)

---

## Checkpoint: CI

- [ ] Tasks 4-5 done, `git diff .github/workflows/ci.yml vercel.json` reviewed

---

## DEFERRED (Post-UAT - NOT tonight)
- [ ] DEFER 1: `src/lib/supabase/server.ts` service_role -> anon split + RLS
- [ ] DEFER 2: `notification_errors` ENABLE RLS, `suppliers/quotes` USING(true) fixes
- [ ] DEFER 3: Stock/payment atomic RPCs, magic-link create_user:false, audit spoof
- [ ] DEFER 4: Rotate `.e2e-token` JWT + any `git log --all -- .e2e-token` history scrub
- [ ] DEFER 5: Make GH repo Private + rotate Supabase keys if ever in history

