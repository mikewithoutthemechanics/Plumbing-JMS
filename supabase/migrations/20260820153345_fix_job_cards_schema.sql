CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by := CURRENT_USER::uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_current_user_on_job_cards ON public.job_cards;
CREATE TRIGGER set_current_user_on_job_cards
    BEFORE INSERT ON public.job_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by();