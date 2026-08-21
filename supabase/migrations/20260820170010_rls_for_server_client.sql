-- 20260820170010_rls_for_server_client.sql
-- Agent 5: SELECT policies required by the anon-key server client.
-- src/lib/supabase/server.ts getSupabaseServerClient() now builds with
-- NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS enforced for server pages/API routes),
-- so every query runs under RLS with the logged-in user's role.
-- Policy names are new; no overlap with Agent 1's migrations
-- (20260820170000_harden_rls.sql, 20260820170005_create_invoices_payments.sql).

-- ============================================================
-- 1. customers — technicians may read any customer.
-- Safe scope: matches the current technician jobs join behavior
-- (technician/jobs page + api/jobs GET embed `customer:customers(name)`).
-- ============================================================
create policy "Technician select customers" on public.customers
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'technician'
    )
  );

-- ============================================================
-- 2. profiles — technicians may read the profiles linked to their
-- assigned jobs (assigned_to_profile:profiles!job_cards_assigned_to_fkey(...)
-- joins in technician pages and api/jobs).
-- Uses the same SECURITY DEFINER idiom as public.is_owner() (used by the
-- existing "Owner select profiles" policy) so this profiles policy never
-- re-enters RLS on job_cards/profiles and cannot create a policy recursion cycle.
-- ============================================================
create or replace function public.is_assigned_technician(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.job_cards jc
    where jc.assigned_to = p_profile_id
      and jc.assigned_to = auth.uid()
  )
  and exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'technician'
  );
$function$;

create policy "Technician select assigned profiles" on public.profiles
  for select
  using (public.is_assigned_technician(id));

grant execute on function public.is_assigned_technician(uuid) to authenticated;

-- ============================================================
-- 3. Grants on customers/profiles to authenticated: already present
-- (verified via information_schema.role_table_grants before authoring this
-- migration — SELECT on both customers and profiles was granted to
-- 'authenticated'). "Accountant select customers" already exists too;
-- neither is recreated here.
-- ============================================================