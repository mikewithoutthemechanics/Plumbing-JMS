-- Fix job_cards UPDATE RLS policies.
--
-- 1. "Owner update job_cards" only had WITH CHECK and no USING, so with an
--    authenticated (anon-key) client the existing row was invisible and every
--    owner UPDATE matched 0 rows (surface: PATCH /api/jobs 500 via .single()).
-- 2. "Technician update own jobs" only had USING with no WITH CHECK and only
--    allowed old statuses ('assigned','in_progress','completed'), while the app
--    lets assigned technicians move completed -> to_be_invoiced.
--    (surface: "new row violates row-level security" toast for technicians).

DROP POLICY IF EXISTS "Owner update job_cards" ON public.job_cards;
CREATE POLICY "Owner update job_cards" ON public.job_cards FOR UPDATE
USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'))
WITH CHECK (exists (select 1 from public.profiles where id = auth.uid() and role = 'owner'));

DROP POLICY IF EXISTS "Technician update own jobs" ON public.job_cards;
CREATE POLICY "Technician update own jobs" ON public.job_cards FOR UPDATE
USING (assigned_to = auth.uid() AND status IN ('assigned','in_progress','completed','to_be_invoiced') AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician'))
WITH CHECK (assigned_to = auth.uid() AND status IN ('assigned','in_progress','completed','to_be_invoiced') AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'technician'));
