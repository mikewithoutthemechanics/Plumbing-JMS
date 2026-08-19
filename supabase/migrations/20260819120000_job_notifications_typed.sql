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

-- Trigger: job assignment (with error logging, NOT silent swallow)
CREATE OR REPLACE FUNCTION log_job_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != OLD.assigned_to THEN
    INSERT INTO job_assigned_notifications (job_card_id, technician_id, customer_name, job_number)
    SELECT NEW.id, NEW.assigned_to, c.name, NEW.job_number
    FROM customers c WHERE c.id = NEW.customer_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to queue job assignment notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: quote enquiry
CREATE OR REPLACE FUNCTION log_quote_enquiry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO quote_enquiry_notifications (quote_id, customer_name, customer_email, customer_phone, description)
  VALUES (NEW.id, NEW.customer_name, NEW.customer_email, NEW.customer_phone, NEW.description);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to queue quote enquiry notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS trigger_job_assigned ON job_cards;
CREATE TRIGGER trigger_job_assigned
AFTER UPDATE ON job_cards FOR EACH ROW
EXECUTE FUNCTION log_job_assignment();

DROP TRIGGER IF EXISTS trigger_quote_enquiry ON quotes;
CREATE TRIGGER trigger_quote_enquiry
AFTER INSERT ON quotes FOR EACH ROW
EXECUTE FUNCTION log_quote_enquiry();