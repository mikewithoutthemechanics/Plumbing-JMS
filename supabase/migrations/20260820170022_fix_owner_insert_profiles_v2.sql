-- Phase C integration policies — fix owner insert profiles recursion (v2)
-- The "Owner insert profiles" policy used public.is_owner(), a SQL-language
-- SECURITY DEFINER function. PostgreSQL can inline STABLE SQL functions into
-- the policy expression, which loses the definer context and re-enters RLS on
-- profiles (error 42P17 infinite recursion). Use a plpgsql SECURITY DEFINER
-- helper instead — plpgsql functions are never inlined.

create or replace function public.is_owner_plpgsql()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
end;
$$;

grant execute on function public.is_owner_plpgsql() to authenticated;

drop policy if exists "Owner insert profiles" on public.profiles;

create policy "Owner insert profiles" on public.profiles
  for insert
  with check (public.is_owner_plpgsql());