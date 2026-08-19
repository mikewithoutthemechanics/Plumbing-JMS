-- job_assigned_notifications (typed)
CREATE TABLE IF NOT EXISTS job_assigned_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id),
  customer_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- quote_enquiry_notifications (typed)
CREATE TABLE IF NOT EXISTS quote_enquiry_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- notification_errors table for tracking trigger failures
CREATE TABLE IF NOT EXISTS notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_record_id UUID,
  error_message TEXT NOT NULL,
  error_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_errors_created ON notification_errors(created_at DESC);

-- Trigger: job assignment (log failures to notification_errors, don't block main operation)
CREATE OR REPLACE FUNCTION log_job_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    -- For INSERT: OLD is null, so just check NEW.assigned_to IS NOT NULL
    -- For UPDATE: also check that assigned_to actually changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
      INSERT INTO job_assigned_notifications (job_card_id, technician_id, customer_name, job_number)
      SELECT NEW.id, NEW.assigned_to, c.name, NEW.job_number
      FROM customers c WHERE c.id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO notification_errors (trigger_name, source_table, source_record_id, error_message, error_detail)
  VALUES ('log_job_assignment', 'job_cards', NEW.id, SQLERRM, SQLSTATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: quote enquiry (log failures to notification_errors, don't block main operation)
CREATE OR REPLACE FUNCTION log_quote_enquiry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quote_enquiry_notifications (quote_id, customer_name, customer_email, customer_phone, description)
  VALUES (NEW.id, NEW.customer_name, NEW.customer_email, NEW.customer_phone, NEW.description);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO notification_errors (trigger_name, source_table, source_record_id, error_message, error_detail)
  VALUES ('log_quote_enquiry', 'quotes', NEW.id, SQLERRM, SQLSTATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS trigger_job_assigned ON job_cards;
CREATE TRIGGER trigger_job_assigned
AFTER INSERT OR UPDATE ON job_cards FOR EACH ROW
EXECUTE FUNCTION log_job_assignment();

DROP TRIGGER IF EXISTS trigger_quote_enquiry ON quotes;
CREATE TRIGGER trigger_quote_enquiry
AFTER INSERT ON quotes FOR EACH ROW
EXECUTE FUNCTION log_quote_enquiry();