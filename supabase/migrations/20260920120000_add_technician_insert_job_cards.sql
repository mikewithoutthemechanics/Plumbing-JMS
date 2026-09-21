-- Add INSERT policy for technicians on job_cards
-- Technicians create jobs in 'pending' status (assigned_to = null)
-- or self-assigned jobs (assigned_to = auth.uid())
-- The created_by field is set automatically by the set_created_by trigger if null

CREATE POLICY "Technician insert job_cards" ON public.job_cards
  FOR INSERT
  WITH CHECK (
    (assigned_to IS NULL OR assigned_to = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'technician'
    )
  );