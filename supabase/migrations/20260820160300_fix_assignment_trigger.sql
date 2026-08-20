-- Fix job-assignment notification trigger:
-- 1. Create notification_errors table if missing
-- 2. Replace log_job_assignment() to fire on INSERT (job created WITH technician) and UPDATE (reassignment)
-- 3. Remove duplicate/legacy triggers so each assignment queues exactly one notification
-- 4. Harden functions: SECURITY DEFINER + pinned search_path

-- Ensure error-logging table exists (migration 20260819120000 may not have applied on this DB)
CREATE TABLE IF NOT EXISTS public.notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_record_id UUID,
  error_message TEXT NOT NULL,
  error_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_errors_created ON public.notification_errors(created_at DESC);

-- Remove legacy/duplicate triggers first
DROP TRIGGER IF EXISTS job_assigned_trigger ON public.job_cards;
DROP TRIGGER IF EXISTS trigger_job_assigned ON public.job_cards;
DROP TRIGGER IF EXISTS quote_enquiry_trigger ON public.quotes;
DROP TRIGGER IF EXISTS trigger_quote_enquiry ON public.quotes;

-- Replace function: fires on INSERT (assigned at creation) and on UPDATE only when assignment changes
CREATE OR REPLACE FUNCTION public.log_job_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (
    TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  ) THEN
    INSERT INTO public.job_assigned_notifications (job_card_id, technician_id, customer_name, job_number)
    SELECT NEW.id, NEW.assigned_to, c.name, NEW.job_number
    FROM public.customers c
    WHERE c.id = NEW.customer_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.notification_errors (trigger_name, source_table, source_record_id, error_message, error_detail)
  VALUES ('log_job_assignment', 'job_cards', NEW.id, SQLERRM, SQLSTATE);
  RETURN NEW;
END;
$$;

-- Recreate job assignment trigger: INSERT OR UPDATE
CREATE TRIGGER trigger_job_assigned
AFTER INSERT OR UPDATE ON public.job_cards
FOR EACH ROW
EXECUTE FUNCTION public.log_job_assignment();

-- Replace quote enquiry function with hardened version
CREATE OR REPLACE FUNCTION public.log_quote_enquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.quote_enquiry_notifications (quote_id, customer_name, customer_email, customer_phone, description)
  VALUES (NEW.id, NEW.customer_name, NEW.customer_email, NEW.customer_phone, NEW.description);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.notification_errors (trigger_name, source_table, source_record_id, error_message, error_detail)
  VALUES ('log_quote_enquiry', 'quotes', NEW.id, SQLERRM, SQLSTATE);
  RETURN NEW;
END;
$$;

-- Recreate quote enquiry trigger: INSERT only
CREATE TRIGGER trigger_quote_enquiry
AFTER INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.log_quote_enquiry();