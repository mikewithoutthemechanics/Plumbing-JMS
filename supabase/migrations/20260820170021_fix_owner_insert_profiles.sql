-- Phase C integration policies — fix owner insert profiles recursion
-- The initial "Owner insert profiles" policy self-referenced public.profiles
-- inside its WITH CHECK, which triggers RLS infinite recursion (error 42P17)
-- because evaluating the subquery re-enters the profiles RLS policies.
-- Use the existing SECURITY DEFINER helper public.is_owner() instead
-- (same pattern as Agent 5's is_assigned_technician).

drop policy if exists "Owner insert profiles" on public.profiles;

create policy "Owner insert profiles" on public.profiles
  for insert
  with check (public.is_owner());