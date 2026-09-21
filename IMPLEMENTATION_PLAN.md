# Implementation Plan - Plumbing-JMS Fixes

## Phase 1: Security & Infrastructure (Week 1)

### Day 1-2: Auth Security
- [ ] **Fix dev_admin cookie bypass** - Make HTTP-only, set via server action, or use env-only flag
- [ ] **Middleware role caching** - Cache profile role in JWT `user_metadata` or session; avoid DB query per request
- [ ] **CSRF referer fallback** - Require `origin` header only for mutating requests
- [ ] **Service role key** - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in production

### Day 3-4: Missing Database Tables
- [ ] Create `suppliers` table with RLS policies
- [ ] Create `quotes` table with RLS policies
- [ ] Fix `payments.method` enum mismatch (remove `'eft'` or add to TS)
- [ ] Add technician INSERT policy on `job_cards` (if business requirement)
- [ ] Add missing composite indexes:
  - `job_cards(created_by)`
  - `job_cards(assigned_to, status)`
  - `job_cards(completed_at, invoiced_at)`
  - `time_logs(clock_in)`

### Day 5: Migration & Deploy
- [ ] Generate migration for new tables/indexes
- [ ] Apply to production Supabase
- [ ] Verify RLS policies work correctly

---

## Phase 2: API Consistency & Rate Limiting (Week 2)

### Day 1-2: API Route Standardization
- [ ] **Bearer token support** - Add to `quotes`, `sync`, `export`, `whatsapp` routes
- [ ] **Use exported clients** - Fix `staff` route to use `getSupabaseAdminClient()`, `notifications` to use `getSupabaseServerClient()`
- [ ] **Zod validation** - Apply existing schemas to `quotes`, `staff`, `whatsapp` routes
- [ ] **Error handling** - Replace generic "Invalid request" with specific errors

### Day 3-4: Rate Limiting
- [ ] Add rate limiting middleware to all API routes
- [ ] Configure limits per endpoint type (auth: 5/min, api: 100/15min)
- [ ] Schedule `cleanupRateLimits()` via pg_cron

### Day 5: Testing
- [ ] Run unit tests (should pass 35/35)
- [ ] Test API endpoints with Postman/curl

---

## Phase 3: Frontend Data Layer (Week 3)

### Day 1-2: Consolidate Data Access
- [ ] **Create React Query mutations** for all direct Supabase calls:
  - Materials CRUD in `JobCardDetail`
  - Signature/tender uploads
  - Time log clock in/out
  - Staff create/delete in `AdminJobsClient`
- [ ] **Replace direct Supabase calls** with mutation hooks
- [ ] **Remove fetch API calls** where mutation hooks exist

### Day 3-4: Query Optimization
- [ ] **Targeted invalidation** - Use filter-aware query keys
- [ ] **Add `useJob` hook** - Use in detail pages instead of manual `useEffect`
- [ ] **Single job cache** - Update `['job', id]` on mutations

### Day 5: Error Handling
- [ ] **Wrap dashboard layout** in `ErrorBoundary`
- [ ] **Replace all `alert()`** with `toast.error()`
- [ ] **Standardize error states** in `useJobs` hook

---

## Phase 4: Forms & UI Polish (Week 4)

### Day 1-2: Client-Side Validation
- [ ] Install `react-hook-form` + `@hookform/resolvers/zod`
- [ ] Add validation to all forms:
  - Job creation (owner/tech)
  - Staff creation
  - Customer creation
  - Material qty/price
  - WhatsApp config
- [ ] Use exported Zod schemas from `validation.ts`

### Day 3-4: Role-Based UI
- [ ] Pass `userRole` and `isAssignedTo` to `StateControls` and `JobCardDetail`
- [ ] Hide "Advance" button for unassigned technicians
- [ ] Hide pricing/finance from non-owners
- [ ] Split `MaterialSelector` into tech (qty) / owner (price) versions

### Day 4-5: E2E Tests
- [ ] Reset test user passwords in Supabase Dashboard
- [ ] Run full E2E suite
- [ ] Fix any flaky tests

---

## Phase 5: Cleanup & Documentation (Week 5)

### Day 1-2: Code Cleanup
- [ ] Remove unused `services.ts` imports from server components
- [ ] Create server-side service module using `getSupabaseServerClient()`
- [ ] Clean up superseded migration files (optional)
- [ ] Remove `alert()` calls, standardize on `toast`

### Day 3-4: Documentation
- [ ] Update README with current architecture
- [ ] Document RLS policy matrix
- [ ] Document API contract (Bearer token usage)
- [ ] Add troubleshooting guide for common issues

### Day 5: Final Validation
- [ ] Full test suite: `npm test` + `npm run test:e2e`
- [ ] Build check: `npm run build`
- [ ] Deploy to staging
- [ ] Smoke test production flows

---

## File Ownership by Phase

| Phase | Files to Modify |
|-------|-----------------|
| 1 | `src/middleware.ts`, `src/lib/supabase/server.ts`, `supabase/migrations/NEW_TABLES.sql` |
| 2 | `src/app/api/*/route.ts`, `src/lib/rate-limiter.ts` |
| 3 | `src/lib/hooks/*.ts`, `src/components/job-card/JobCardDetail.tsx`, `src/app/(dashboard)/*/page.client.tsx` |
| 4 | `src/lib/validation.ts`, `src/components/job-card/StateControls.tsx`, all `page.client.tsx` |
| 5 | `src/lib/supabase/services.ts`, `STATE_MANAGEMENT.md`, `README.md` |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Unit tests | 35/35 pass |
| E2E tests | 12/12 pass (fix-validation) |
| Build | 0 errors, 0 warnings |
| API response time | <200ms p95 |
| No security findings | 0 critical/high |

---

## Dependencies to Add

```bash
npm install react-hook-form @hookform/resolvers/zod
```

---

## Migration Order for Phase 1

```sql
-- 1. Create suppliers table
-- 2. Create quotes table  
-- 3. Fix payments.method enum
-- 3. Add composite indexes
-- 4. Technician INSERT policy (if needed)
```

---

## Notes

- **Test user passwords**: Reset in Supabase Dashboard before Phase 3
- **Legacy API keys**: Disabled - all admin ops via Dashboard
- **Service role key**: Only in `server.ts` - never in client code
- **Dev mode**: Use `NEXT_PUBLIC_DEMO_MODE=false` in production