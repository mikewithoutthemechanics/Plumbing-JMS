-- Phase C integration policies
-- Root cause: Agent 5 switched getSupabaseServerClient() to the anon key
-- (finding #3), so RLS is now enforced on server pages/API routes. Four flows
-- previously worked through the service-role bypass and would now break.
-- These policies restore those flows under RLS. No agent owned these files, so
-- the coordinator added them during Phase C integration.
--
-- 1. Staff creation (src/app/api/staff/route.ts POST) inserts into profiles.
--    Owner-role check is enforced in the route; add the matching INSERT policy.
-- 2. Public quote form (src/app/api/quotes/route.ts POST) is unauthenticated.
--    Restore anonymous insert into quotes (previous public behavior).
-- 3. Technician offline sync (src/app/api/sync/route.ts) writes job_materials
--    for their assigned jobs. Route validates ownership in-app; add matching
--    RLS policies (INSERT/UPDATE/DELETE) scoped to assigned jobs.
-- 4. Accountant jobs/exports pages join assigned_to_profile:profiles(full_name).
--    Add an accountant SELECT policy on profiles so the join returns names.

-- 1. Owner insert profiles (staff creation)
create policy "Owner insert profiles" on public.profiles
  for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- 2. Public insert quotes (unauthenticated quote form)
create policy "Public insert quotes" on public.quotes
  for insert
  with check (auth.uid() is null);

-- 3. Technician job_materials write policies (offline sync, assigned jobs)
create policy "Technician insert job_materials" on public.job_materials
  for insert
  with check (
    exists (
      select 1 from public.job_cards jc
      join public.profiles p on p.id = auth.uid()
      where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
    )
  );

create policy "Technician update job_materials" on public.job_materials
  for update
  using (
    exists (
      select 1 from public.job_cards jc
      join public.profiles p on p.id = auth.uid()
      where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
    )
  )
  with check (
    exists (
      select 1 from public.job_cards jc
      join public.profiles p on p.id = auth.uid()
      where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
    )
  );

create policy "Technician delete job_materials" on public.job_materials
  for delete
  using (
    exists (
      select 1 from public.job_cards jc
      join public.profiles p on p.id = auth.uid()
      where jc.id = job_card_id and jc.assigned_to = auth.uid() and p.role = 'technician'
    )
  );

-- 4. Accountant select profiles (for assigned_to_profile joins)
create policy "Accountant select profiles" on public.profiles
  for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'accountant'))
  );