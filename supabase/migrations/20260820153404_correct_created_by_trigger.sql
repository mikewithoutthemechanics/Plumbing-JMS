DROP FUNCTION IF EXISTS set_created_by() CASCADE;
DROP TRIGGER IF EXISTS set_current_user_on_job_cards ON public.job_cards;

CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        BEGIN
            NEW.created_by := (request.jwt.claims ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Must be set created_by (no authenticated user found)';
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_current_user_on_job_cards
    BEFORE INSERT ON public.job_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by();