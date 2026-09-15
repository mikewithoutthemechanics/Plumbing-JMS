# Phase 1 — Safe Fixes (Non-Breaking, No Migration)

> **Scope:** Only defensive, additive changes. No `supabase/migrations/*`, no RLS, no breaking contract. All edits are local until `git push master` → Vercel `prj_lF1HY8WfNEdrlc0MKfJljEckzxvY`.
> Validated against live `master@398c3a1` on `2026-09-14`.

## Principles
1. **Additive only** — valid requests keep `200/201`, invalid now `400/403` (previously `500` or silent corruption).
2. **No DB migration** — no `supabase db push`, no `pg_policies` change, no `FOR UPDATE` RPC.
3. **Minimal surface** — 3 files edited, 2 files created (tests). Everything else untouched.
4. **Validation-first** — Zod + `src/lib/utils/permissions.ts:111` + `src/lib/validation.ts:14` as source of truth.

## Fix Inventory

| # | Gap | File | Change | Validation | Risk |
|---|-----|------|--------|------------|------|
| 1 | `job_number` UNIQUE collision `500` | `src/app/api/jobs/route.ts:104` | Retry loop 3× on `23505` | `error.code==='23505'` else `500`; preserves `JOB-${Date.now()}-${rand4}` format | None |
| 2 | `?technicianId` enumeration | `src/app/api/jobs/route.ts:43` | Guard `if(role==='technician' && technicianId && technicianId!==user.id) 403` | Must pass before `supabase.from('job_cards').eq('assigned_to',…)` query; uses existing `profile.role` | None — valid tech already sends own id |
| 3 | Unbounded `GET /api/jobs` | `src/app/api/jobs/route.ts:30` | Opt-in `?limit & ?offset` → `.range(o,o+l-1)` only if present | `z.coerce.number().int().min(1).max(100)` for limit, `min(0)` for offset; no default limit = backward-compat; paginated clients add params | None — without params behavior identical |
| 4 | `job_materials` negative/qty bypass via sync | `src/app/api/sync/route.ts:75` | Enforce `jobMaterialQtySchema:40` + `admin_unit_price` not in allowlist | `validateWith(jobMaterialQtySchema,payload)` → `400`; `payload.quantity` must be `positive max 10000`, `material_id||custom_name` required | None — previously corrupted `grand_total` via negative qty |
| 5 | `assigned→completed` 0-labour skip | `src/components/job-card/StateControls.tsx:18` | UI-only: disable `completed` when `status==='assigned'` and `hasTimeLogs===false` | New prop `hasTimeLogs:boolean` derived from `time_logs` count; button `disabled` + tooltip `Start job first`; API still allows skip (no break) | None — API unchanged, UI guard only |

## Files In Scope (Phase 1 only)

**Edit (3):**
- `src/app/api/jobs/route.ts` — fixes #1, #2, #3 (target lines `30-50`, `104-130`)
- `src/app/api/sync/route.ts` — fix #4 (target lines `73-106`)
- `src/components/job-card/StateControls.tsx` — fix #5 (props + render)

**Create (2, tests only):**
- `src/lib/utils/calculations.test.ts` — covers `calculateJobTotals` edge `hours=0`, `materials=[]`, `VAT 0.15`
- `src/app/api/jobs/route.test.ts` — covers `#2` 403 and `#3` limit/offset 400/200

**Explicitly NOT touched:**
`supabase/migrations/*`, `src/lib/supabase/server.ts`, `src/lib/utils/permissions.ts`, `src/lib/validation.ts`, `src/lib/constants/job-states.ts`, `supabase/*`, `src/app/api/invoices/*`, `src/components/job-card/JobCardDetail.tsx`, `src/app/(dashboard)/*`, `package.json`, `vercel.json`

## Deferred (Not Phase 1) — Needs Migration / Breaking Review
- Atomic stock `UPDATE ... SET quantity_on_hand = GREATEST(0, …) WHERE quantity_on_hand>=qty` RPC (`src/app/api/jobs/route.ts:332`)
- DB trigger `hours = clock_out - clock_in` + `line_total = admin_unit_price*quantity` + `CHECK quantity_on_hand>=0`
- `cancelled` terminal state + `assigned_to IS NULL → pending` coercion (`src/lib/constants/job-states.ts:14`)
- RLS `WITH CHECK (admin_unit_price>=0)` for `job_materials` direct inserts (`src/components/job-card/JobCardDetail.tsx:188`)
- Hard-delete `payments` audit (`src/app/api/jobs/route.ts:402`) + `debtors_view` history
- VAT env `NEXT_PUBLIC_VAT_RATE` fallback (`src/lib/constants/job-states.ts:23`)

## Validation Matrix (What gates what)

```
POST /api/jobs (owner)
  → validateWith(jobCreateByOwnerSchema) src/lib/validation.ts:14
    customer_id:uuid, description:min1/max500, admin_hourly_rate:number>=0, assigned_to:uuid|null
  → job_number retry on 23505
  → auto-assign via counts in [assigned,in_progress] src/app/api/jobs/route.ts:118

POST /api/jobs (technician)
  → validateWith(jobCreateByTechnicianSchema) src/lib/validation.ts:22
    customer_id:uuid, description:min1/max500, technician_notes?; pricing stripped, no 403 (silent)

GET /api/jobs
  → auth: Bearer or cookie src/app/api/jobs/route.ts:15
  → role from profiles.role
  → if technicianId && role==='technician' && technicianId!==user.id → 403 (new)
  → ?status? eq, ?technicianId? eq assigned_to, ?limit/?offset? range (new, opt-in)
  → canAccessJob(role,status,isAssigned) src/lib/utils/permissions.ts:69 + created_by fallback
  → canSeePricing(role) src/lib/utils/permissions.ts:78 → null out pricing for non-owner

PATCH /api/jobs
  → canAdvanceState(role,from,to,isAssigned) src/lib/utils/permissions.ts:111 + VALID_TRANSITIONS
  → stock shortfall check before invoiced src/app/api/jobs/route.ts:227 (409 if any)

sync POST job_materials
  → validateWith(jobMaterialQtySchema) src/lib/validation.ts:40 (new enforcement)
  → ownership: job_cards.assigned_to===user.id

StateControls
  → JOB_STATE_TRANSITIONS[job.status] src/lib/constants/job-states.ts:14 + JOB_STATE_LABELS
  → disabled completed when !hasTimeLogs (UI only)
```

## Implementation Plan — Phase 1 Steps

### Step 1 — `src/app/api/jobs/route.ts` (3 fixes, one file)
1. **GET pagination (opt-in):** After `const technicianId = searchParams.get('technicianId')` (`:13`), parse `limitRaw/offsetRaw`. If present, `z.coerce.number().int().min(1).max(100).safeParse(limitRaw)` → `400 {error:'limit must be 1-100'}`; same for offset `0..10000`. Apply `query = query.range(offset, offset+limit-1)` only when parsed. No else branch.
2. **TechnicianId guard:** Immediately after `const userRole = profile?.role` (`:28`), add:
   ```ts
   if (userRole==='technician' && technicianId && technicianId!==user.id) return NextResponse.json({error:'Forbidden: cannot query other technician jobs'},{status:403});
   ```
3. **job_number retry:** Replace single `insert({...}).select().single()` (`:128`) with:
   ```ts
   let job:any=null, lastErr:any=null;
   for(let i=0;i<3;i++){
     const jn = `JOB-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
     const {data,error} = await supabase.from('job_cards').insert({...payload,job_number:jn}).select().single();
     if(!error){job=data;break;}
     if((error as any).code!=='23505'){lastErr=error;break;}
     lastErr=error;
   }
   if(!job) return NextResponse.json({error:'Failed to create job card'}, {status:500});
   ```

### Step 2 — `src/app/api/sync/route.ts` (1 fix)
After `if (table==='job_materials')` block (`:73`), inject before `const jobCardId`:
```ts
if (table==='job_materials' && operation!=='DELETE') {
  const errs = validateWith(jobMaterialQtySchema, { material_id: payload.material_id, custom_name: payload.custom_name, quantity: payload.quantity });
  if (errs.length) return NextResponse.json({error: errs.join(', ')},{status:400});
  if (payload.admin_unit_price!==undefined) return NextResponse.json({error:'admin_unit_price cannot be set via sync'},{status:400});
}
```
Import `validateWith, jobMaterialQtySchema` from `@/lib/validation` at top.

### Step 3 — `src/components/job-card/StateControls.tsx` (1 fix, UI-only)
- Props: `hasTimeLogs?: boolean` (default `true` to keep existing callers working).
- Render: `const isCompletedDisabled = job.status==='assigned' && hasTimeLogs===false;` Disable `completed` button when `isCompletedDisabled`, add `title="Start job first — no time logged"` and `className="opacity-50 cursor-not-allowed"` variant. Do not block API.

### Step 4 — Tests (create only, no edits to prod code beyond above)
- `src/lib/utils/calculations.test.ts`: 4 cases `calculateJobTotals(450,0,[])→{labour:0,…}`, `calculateJobTotals(450,1.5,[{100,2}])→{labour:675,materials:200,subtotal:875,vat:131.25,grand:1006.25}`, `hours negative→0`, `quantity 0→0`.
- `src/app/api/jobs/route.test.ts`: mock `getSupabaseServerClient` → `user.id='tech-1', profile.role='technician'`; test `GET ?technicianId=other →403`, `GET ?limit=200 →400`, `GET ?limit=10 →200 with range called`.

### Verification (before any push)
```bash
npm run typecheck   # tsc --noEmit — must exit 0
npm test -- --run   # vitest — new tests + existing 21 must pass
npm run build       # 33 routes, ~33s — must succeed
git diff --stat     # expect: 3 M, 2 A (untracked), 0 supabase/migrations
git diff --name-only # must NOT contain supabase/, permissions.ts, validation.ts, constants/job-states.ts
```

### Rollback / Blast Radius
- Each fix is independent; revert single hunk without touching others.
- `GET` pagination and `technicianId` guard are early returns — removal restores prior unbounded + permissive behavior.
- `StateControls` default `hasTimeLogs=true` ensures callers not passing prop behave exactly as before.

## Out of Scope Confirmation
No edits to: `supabase/migrations/**`, `src/lib/supabase/server.ts`, `src/lib/utils/permissions.ts`, `src/lib/validation.ts`, `src/lib/constants/job-states.ts`, `src/app/api/invoices/*`, `src/app/(dashboard)/**` (except via new prop default), `vercel.json`, `package.json`.
