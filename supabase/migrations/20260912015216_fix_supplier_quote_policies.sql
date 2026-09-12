-- Fix over-permissive suppliers/quotes RLS policies.
--
-- Why: 20260820160000_enable_rls_security.sql created four policies with
-- USING (true), which allows ANY authenticated caller (any role, anon-key
-- client) to DELETE from or UPDATE suppliers/quotes:
--   - "Owner delete suppliers" FOR DELETE USING (true)
--   - "Owner update suppliers" FOR UPDATE USING (true) (WITH CHECK was owner-only)
--   - "Owner delete quotes"    FOR DELETE USING (true)
--   - "Owner update quotes"    FOR UPDATE USING (true) (WITH CHECK was owner-only)
-- For UPDATE, Postgres checks USING for the old row AND WITH CHECK for the new
-- row, so a USING (true) still lets a non-owner match and rewrite rows (subject
-- only to the new-row check). For DELETE, USING (true) alone permits the delete.
-- This migration replaces every USING (true) with an owner-role check:
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
-- in BOTH USING and WITH CHECK (DELETE uses USING only; UPDATE uses both),
-- mirroring the style of the original migration. Idempotent via DROP IF EXISTS.
-- Live pg_policies on project sunjjexcyfrlucitngwx confirmed the same four
-- policy names on public.suppliers / public.quotes. Intentional policies such
-- as "Public insert quotes" (unauthenticated quote form) are left untouched.
-- Human must apply with `supabase db push` (do NOT auto-push from agents).

-- ============================================================
-- suppliers — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete suppliers" ON public.suppliers;
CREATE POLICY "Owner delete suppliers" ON public.suppliers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- suppliers — UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Owner update suppliers" ON public.suppliers;
CREATE POLICY "Owner update suppliers" ON public.suppliers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- quotes — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete quotes" ON public.quotes;
CREATE POLICY "Owner delete quotes" ON public.quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- quotes — UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Owner update quotes" ON public.quotes;
CREATE POLICY "Owner update quotes" ON public.quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );
