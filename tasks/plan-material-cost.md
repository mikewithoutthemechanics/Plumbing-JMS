# Plan: Material qty by tech, cost/rate by owner, tech-blind invoice

## Overview
Current: owner creates jobs with pricing, tech can see pricing via GET (canSeePricing filters but still leaks via admin_hourly_rate?), tech adds materials/time directly via supabase bypass. Desired: tech creates job card (populated), owner then inputs rate/costs which feed invoice tech never sees, invoice accumulates additions. Mobile-first, owner dash + tech flows.

## Architecture Decisions
- Keep single `job_cards` table, add role-based field allowlist instead of new tables.
- `POST /api/jobs`: allow `technician` to create with `customer_id, description, technician_notes` only; `owner` can set `admin_hourly_rate, admin_notes, assigned_to`. Validate with Zod split schemas.
- `PATCH /api/jobs`: allow `technician` to update `technician_notes, quantity` on own jobs only; block `admin_hourly_rate, admin_notes, labour_cost` etc. Enforce via `canSetPricing`/`canAdvanceState`.
- `GET /api/jobs`: `canSeePricing` already nulls pricing for technician - keep, but also null for accountant? Keep accountant hidden per current but owner sees. Tech gets qty only.
- `job_materials`: tech sets `material_id/custom_name + quantity` (qty), owner sets `admin_unit_price` -> `line_total` computed server-side. Add `PATCH /api/materials` or extend `POST /api/jobs`? Keep `job_materials` inserts via supabase but gate `admin_unit_price` via RLS? Simpler: add `POST /api/job-materials` with role check: tech can insert qty-only, owner can set price.
- `invoices`: owner starts invoice when moving `completed -> to_be_invoiced` or `invoiced`, tech never sees `GET /api/invoices` (already `canSeePricing` false, but need explicit `canAccessInvoice`).
- Mobile: tech create job modal on `/technician/jobs`, owner pricing sheet on `/admin/jobs/[id]` + `/admin/overview` New Job still works.

## Dependency Graph
```
profiles/roles
  -> job_cards RLS + API allowlist
    -> job_materials qty vs price split
      -> calculations (tech qty + owner price -> totals)
        -> invoices (owner only, accumulates)
          -> UI: tech create (no price) + owner pricing (no qty hidden)
```

## Task List

### Phase 1: API contract split (foundation)
- [ ] Task 1: Split validation schemas (`jobCreateByTechnician`, `jobCreateByOwner`, `jobUpdatePricingByOwner`) in `src/lib/validation.ts`
- [ ] Task 2: Update `POST /api/jobs` to allow `technician` create (qty/desc only) + `owner` create (pricing), enforce `created_by = user.id`, auto-assign logic; add tests
- [ ] Task 3: Update `PATCH /api/jobs` to allow `technician` to update `technician_notes` + advance own job, block pricing fields; owner can set `admin_hourly_rate` + recalc; add `PUT /api/job-materials` qty vs price gate

### Checkpoint: API
- [ ] `POST` as tech creates `pending` job without pricing -> `GET` as tech returns pricing null, as owner returns pricing
- [ ] `PATCH` as tech cannot set `admin_hourly_rate` (403), owner can
- [ ] `vitest` + `npm run build` pass

### Phase 2: Technician create & qty flow
- [ ] Task 4: `technician/jobs/page.client.tsx` - add `+ New Job` modal (customer, description, technician_notes) without rate, calls `POST /api/jobs` (was direct supabase insert), show qty inputs for materials
- [ ] Task 5: `job_materials` UI split - tech sees `quantity` input only, owner sees `quantity` (read-only) + `admin_unit_price` input + `line_total`; wire `POST /api/job-materials` for tech qty, `PATCH` for owner price

### Checkpoint: Tech flow
- [ ] Tech creates job on mobile, appears in owner `pending` list, owner sees qty, can add price
- [ ] Manual mobile test on `/technician/jobs`

### Phase 3: Owner pricing & invoice (tech-blind)
- [ ] Task 6: `admin/jobs/[id]/page.client.tsx` pricing sheet - `admin_hourly_rate` input, per-material `admin_unit_price`, recalc preview `calculateJobTotals`, `Start Invoice` button `POST /api/invoices` (tech never sees)
- [ ] Task 7: `GET /api/jobs` + `GET /api/invoices` - ensure `canSeePricing` nulls for `technician` always, and `technician` gets `403` on `/api/invoices`; owner sees invoice accumulating with `PATCH /api/jobs` additions

### Checkpoint: Invoice
- [ ] Owner sets rate $450, adds material qty 2 @ $30 by tech, owner sets price $30 -> totals `labour 900 + materials 60 = subtotal 960 + VAT 144 = 1920` visible to owner only, tech sees `null` totals
- [ ] Owner `Start Invoice` creates `invoices` row, tech `GET /api/invoices` 403

### Phase 4: Polish & mobile
- [ ] Task 8: Mobile sticky `+ New Job` already on owner dash - add same on tech dash; ensure `+ New Job` on owner dash still works with new split
- [ ] Task 9: Audit + notifications still trigger on assignment, not on tech create

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS bypass via service_role | High | Keep allowlist in API, add `WITH CHECK (created_by = auth.uid())` later |
| Tech pricing leak via direct supabase select | Med | Keep `canSeePricing` null + add RLS view without pricing |
| Invoice tech access | Med | Explicit 403 in `api/invoices` |

