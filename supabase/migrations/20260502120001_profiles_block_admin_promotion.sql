-- Block promoting any profile to admin via PostgREST (authenticated JWT).
-- The only admin row should come from bootstrap insert (handle_new_user). Break-glass:
-- use service_role or a direct DB session (session role not "authenticated").
-- The partial unique index profiles_single_admin_idx remains the hard constraint.

CREATE OR REPLACE FUNCTION public.profiles_block_admin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  session_role text := coalesce(auth.role()::text, '');
BEGIN
  IF NEW.role = 'admin'
     AND OLD.role IS DISTINCT FROM 'admin'
     AND session_role = 'authenticated' THEN
    RAISE EXCEPTION 'Admin role cannot be assigned through the API; the organization has a single bootstrap admin.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_admin_promotion ON public.profiles;
CREATE TRIGGER profiles_block_admin_promotion
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_admin_promotion();
