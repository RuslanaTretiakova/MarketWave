-- Service-role only: password reset flow needs to distinguish unknown email (product spec).
-- Do not grant to anon/authenticated (avoids account enumeration from the API).

CREATE OR REPLACE FUNCTION public.auth_user_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email IS NOT NULL
      AND lower(btrim(email)) = lower(btrim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_email_exists(text) TO service_role;
