-- Phase C integration policies — fix accountant select profiles recursion
-- The "Accountant select profiles" policy from 20260820170020 directly
-- embedded `EXISTS (SELECT 1 FROM public.profiles ...)` in its qual. That is a
-- direct self-reference on profiles, which triggers RLS infinite recursion
-- (error 42P17) for EVERY access to profiles (SELECT and INSERT alike).
-- Replace it with a plpgsql SECURITY DEFINER helper (never inlined), matching
-- the is_owner()/is_assigned_technician() pattern.

create or replace function public.is_owner_or_accountant()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'accountant')
  );
end;
$$;

grant execute on function public.is_owner_or_accountant() to authenticated;

drop policy if exists "Accountant select profiles" on public.profiles;

create policy "Accountant select profiles" on public.profiles
  for select
  using (public.is_owner_or_accountant());