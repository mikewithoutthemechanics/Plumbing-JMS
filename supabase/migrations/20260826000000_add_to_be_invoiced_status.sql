-- Add 'to_be_invoiced' to the job_cards status CHECK constraint.
-- The app workflow is completed → to_be_invoiced → invoiced, but the DB
-- constraint rejected 'to_be_invoiced', causing PATCH /api/jobs 500 errors.

ALTER TABLE job_cards DROP CONSTRAINT IF EXISTS job_cards_status_check;
ALTER TABLE job_cards ADD CONSTRAINT job_cards_status_check
  CHECK (status IN ('pending','assigned','in_progress','completed','to_be_invoiced','invoiced'));
