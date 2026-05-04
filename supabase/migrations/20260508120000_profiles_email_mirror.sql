-- Mirror auth email on profiles for app reads; keep in sync from auth.users.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.profiles.email IS
  'Replica of auth.users.email for RLS-safe reads in the app; updated by triggers.';

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS DISTINCT FROM u.email);

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_email_on_auth_user ON auth.users;
CREATE TRIGGER sync_profile_email_on_auth_user
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming text := NEW.raw_user_meta_data ->> 'role';
  bootstrap_admin boolean :=
    coalesce((NEW.raw_user_meta_data ->> 'is_bootstrap_admin')::boolean, false);
  has_admin boolean := EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');
  resolved public.user_role;
  pwd_change boolean;
BEGIN
  IF NOT has_admin AND bootstrap_admin AND incoming = 'admin' THEN
    resolved := 'admin';
    pwd_change := false;
  ELSIF NOT has_admin AND bootstrap_admin AND incoming IN ('client', 'sourcer', 'manager', 'copywriter') THEN
    resolved := incoming::public.user_role;
    pwd_change := true;
  ELSIF NOT has_admin THEN
    resolved := 'client';
    pwd_change := true;
  ELSE
    IF incoming IN ('client', 'sourcer', 'manager', 'copywriter') THEN
      resolved := incoming::public.user_role;
    ELSE
      resolved := 'client';
    END IF;
    pwd_change := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, require_password_change, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    resolved,
    pwd_change,
    NEW.email
  );
  RETURN NEW;
END;
$$;
