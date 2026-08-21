-- Harden RLS: replace blanket USING(true) DELETE/UPDATE policies with owner-role checks.
-- NOTE: public.record_payment RPC (finding #11) is DEFERRED and NOT in this migration.
-- The live project has NO public.invoices / public.payments tables (verified via
-- information_schema / pg_class on the linked project). Creating the function would fail
-- because RETURNS SETOF public.invoices requires the table type to exist. The coordinator
-- must decide who creates those tables; the RPC can then be added in a follow-up migration.

-- ============================================================
-- customers — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete customers" ON public.customers;
CREATE POLICY "Owner delete customers" ON public.customers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- materials — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete materials" ON public.materials;
CREATE POLICY "Owner delete materials" ON public.materials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- job_cards — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete job_cards" ON public.job_cards;
CREATE POLICY "Owner delete job_cards" ON public.job_cards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- job_materials — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete job_materials" ON public.job_materials;
CREATE POLICY "Owner delete job_materials" ON public.job_materials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- time_logs — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete time_logs" ON public.time_logs;
CREATE POLICY "Owner delete time_logs" ON public.time_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- banking_details — DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete banking_details" ON public.banking_details;
CREATE POLICY "Owner delete banking_details" ON public.banking_details
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- quotes — DELETE + UPDATE
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

-- ============================================================
-- suppliers — DELETE + UPDATE
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
-- sync_queue — DELETE + UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Owner delete sync_queue" ON public.sync_queue;
CREATE POLICY "Owner delete sync_queue" ON public.sync_queue
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Owner update sync_queue" ON public.sync_queue;
CREATE POLICY "Owner update sync_queue" ON public.sync_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- time_logs — technician may UPDATE own rows (fixes clock-out, finding #1)
-- ============================================================
CREATE POLICY "Technician update own time_logs" ON public.time_logs
  FOR UPDATE
  USING (
    technician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'technician'::text
    )
  )
  WITH CHECK (technician_id = auth.uid());