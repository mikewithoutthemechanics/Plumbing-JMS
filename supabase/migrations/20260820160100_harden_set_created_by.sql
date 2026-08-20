-- Harden set_created_by: trigger-only function, SECURITY INVOKER, pinned search_path
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_created_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_created_by() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_created_by() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_created_by() TO service_role;