-- Enable RLS and add policies for tables that were exposed

-- ============================================================
-- suppliers
-- ============================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accountant select suppliers" ON public.suppliers;
CREATE POLICY "Accountant select suppliers" ON public.suppliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ANY (ARRAY['owner'::text, 'accountant'::text])
    )
  );

DROP POLICY IF EXISTS "Owner delete suppliers" ON public.suppliers;
CREATE POLICY "Owner delete suppliers" ON public.suppliers
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Owner insert suppliers" ON public.suppliers;
CREATE POLICY "Owner insert suppliers" ON public.suppliers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Owner select suppliers" ON public.suppliers;
CREATE POLICY "Owner select suppliers" ON public.suppliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Owner update suppliers" ON public.suppliers;
CREATE POLICY "Owner update suppliers" ON public.suppliers
  FOR UPDATE
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Technician select suppliers" ON public.suppliers;
CREATE POLICY "Technician select suppliers" ON public.suppliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'technician'::text
    )
  );

-- ============================================================
-- quotes
-- ============================================================
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner delete quotes" ON public.quotes;
CREATE POLICY "Owner delete quotes" ON public.quotes
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Owner insert quotes" ON public.quotes;
CREATE POLICY "Owner insert quotes" ON public.quotes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Owner select quotes" ON public.quotes;
CREATE POLICY "Owner select quotes" ON public.quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Owner update quotes" ON public.quotes;
CREATE POLICY "Owner update quotes" ON public.quotes
  FOR UPDATE
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

-- ============================================================
-- job_assigned_notifications
-- ============================================================
ALTER TABLE public.job_assigned_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner select job_assigned_notifications" ON public.job_assigned_notifications;
CREATE POLICY "Owner select job_assigned_notifications" ON public.job_assigned_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );

DROP POLICY IF EXISTS "Technician select own job_assigned_notifications" ON public.job_assigned_notifications;
CREATE POLICY "Technician select own job_assigned_notifications" ON public.job_assigned_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_cards jc
      JOIN public.profiles p ON p.id = auth.uid() AND p.role = 'technician'::text
      WHERE jc.id = job_assigned_notifications.job_card_id
        AND jc.assigned_to = auth.uid()
    )
  );

-- ============================================================
-- quote_enquiry_notifications
-- ============================================================
ALTER TABLE public.quote_enquiry_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner select quote_enquiry_notifications" ON public.quote_enquiry_notifications;
CREATE POLICY "Owner select quote_enquiry_notifications" ON public.quote_enquiry_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'::text
    )
  );