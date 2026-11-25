# Implementation Plan: Plumbing-JMS Safe Repo Hygiene (Prod-Frozen)

## Overview
Client is testing tonight (2026-09-14 eve) on prod `plumbing-jms.vercel.app` / `app.punctualplumbers.co.za`. App is live, no functional/code changes tonight. This plan covers **non-breaking repo hygiene only** (npm standardization, tracked artifact cleanup, docs, CI stabilization) and **defers all code/RLS/security fixes** to post-UAT. All tasks are verified with `npm run build` / `npm test -- --run` / `git status` - no DB or runtime mutations.

## Architecture Decisions
- **Stick with npm (not pnpm):** pnpm broke build last time. Source has both `pnpm-lock.yaml` (331k) + `package-lock.json` (567k) + `pnpm-workspace.yaml`. Vercel last deploy used `pnpm@10` auto-detect (57s). Switching fully to npm means deleting pnpm files and setting `cache: npm` in CI + `installCommand: npm ci` in Vercel if needed. Verified `npm run build` passes locally with both present, so npm path is viable.
- **No runtime changes tonight:** Middleware, RLS, `server.ts` service_role bypass, stock/payment races, etc. from full review are DEFERRED. They would change app behavior under test.
- **Git hygiene without history rewrite:** `git rm --cached` for leaked artifacts (`.e2e-token`, `playwright-report/`, `test-results/`, `npm-install.err`) - removes from future commits but keeps history (no `filter-branch`/`BFG` that would force-push master and break Vercel). Secret rotation is a separate manual step post-UAT.
- **Docs-only README swap:** `.LOCAL placeholder` - `README.md` is stock `create-next-app`, replace with `HANDOVER.md` content (docs only, no code).

## Task List

### Phase 1: Repo Hygiene (Safe, no runtime change)
- [ ] Task 1: Extend `.gitignore` + remove tracked artifacts
- [ ] Task 2: Standardize on npm (delete pnpm files, verify build)
- [ ] Task 3: Replace boilerplate README

### Checkpoint: Hygiene
- [ ] `git status` clean except intended deletes
- [ ] `npm ci` + `npm run build` pass
- [ ] `npm test -- --run` still 21/21
- [ ] `vercel inspect` still READY after next GitHub push (no auto-break)

### Phase 2: CI Stabilization (Safe, CI-only)
- [ ] Task 4: Fix `ci.yml` npm/pnpm mismatch note + add env wiring (commented `NEXT_PUBLIC_*` -> `secrets.*` with fallback)
- [ ] Task 5: Remove stale `playwright.config.ts` duplication comment + keep Vercel `installCommand` explicit

### Checkpoint: CI
- [ ] `ci.yml` lints, build job has `env:` wired (no functional app change)

### Phase 3: Deferred (Post-UAT, NOT tonight)
- [ ] DEFERRED: RLS bypass `server.ts` anon vs service_role (C1)
- [ ] DEFERRED: `notification_errors` ENABLE RLS, supplier `USING(true)` fixes, `debtors_view` security_invoker, `patches` for stock/payment races, magic-link `create_user:false`, etc.
- [ ] DEFERRED: Rotate leaked secrets (`.e2e-token` JWT `e2e.owner@test`, `SUPABASE_SERVICE_ROLE_KEY` if ever in history - check `git log --all -- .e2e-token`)
- [ ] DEFERRED: Make GH repo Private + transfer to client org

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Deleting `pnpm-lock.yaml` breaks Vercel auto-detect | High - next GitHub push fails build | Verify `npm ci`+`npm run build` locally first; set Vercel `installCommand: npm ci` explicitly before deleting; keep `package-lock.json` intact |
| `git rm --cached` still leaves secret in history | Medium | Document rotation needed; don't force-push tonight; schedule `BFG` post-UAT |
| README swap confuses Vercel | Low | Docs only, no build impact |
| CI env uncomment breaks CI without secrets | Medium | Wire with `${{ secrets.* }}` and allow fallback dummy URL if missing; test with `workflow_dispatch` |

## Open Questions
- Rotate `.e2e-token` JWT now or post-UAT? (contains `e2e.owner@test.punctualplumbers.co.za`, exp 1789281066)
- Make `mikewithoutthemechanics/Plumbing-JMS` Private now or after client handover?
- Vercel `installCommand` override needed before pnpm file delete?

## Task List Target
Tasks tracked in `tasks/todo.md` (default). No external tracker.

