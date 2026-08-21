DROP FUNCTION IF EXISTS set_created_by() CASCADE;
DROP TRIGGER IF EXISTS set_current_user_on_job_cards ON public.job_cards;

CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        BEGIN
            NEW.created_by := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'created_by must be set (no authenticated user found in request context)';
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_current_user_on_job_cards
    BEFORE INSERT ON public.job_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by();