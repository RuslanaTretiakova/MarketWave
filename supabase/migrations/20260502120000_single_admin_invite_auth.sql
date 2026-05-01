-- Single manual admin, require_password_change, invite-only roles, audit log, security trigger

-- ─── profiles.require_password_change ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS require_password_change boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.require_password_change IS
  'When true, user must set password via app before accessing protected routes; cleared only via service_role.';

-- At most one row may have role = admin
CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_admin_idx
  ON public.profiles ((true))
  WHERE role = 'admin';

-- ─── Block authenticated users from clearing require_password_change via PostgREST
CREATE OR REPLACE FUNCTION public.profiles_enforce_require_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  session_role text := coalesce(auth.role()::text, '');
BEGIN
  IF OLD.require_password_change IS TRUE AND NEW.require_password_change IS FALSE THEN
    IF jwt_role = 'service_role' OR session_role = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'require_password_change may only be cleared by a trusted server operation'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_require_password_change_guard ON public.profiles;
CREATE TRIGGER profiles_require_password_change_guard
  BEFORE UPDATE OF require_password_change ON public.profiles
  FOR EACH ROW
  WHEN (OLD.require_password_change IS TRUE AND NEW.require_password_change IS FALSE)
  EXECUTE FUNCTION public.profiles_enforce_require_password_change();

-- ─── auth audit (invite / resend) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_email text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_audit_log_admin_select" ON public.auth_audit_log;
CREATE POLICY "auth_audit_log_admin_select"
  ON public.auth_audit_log FOR SELECT
  USING (public.get_my_role() = 'admin');

REVOKE ALL ON TABLE public.auth_audit_log FROM PUBLIC;
GRANT SELECT ON TABLE public.auth_audit_log TO authenticated;

-- Inserts from service_role (adminClient) bypass RLS

-- ─── handle_new_user: manual bootstrap admin only; invites never become admin ──
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
    -- No admin yet and not flagged bootstrap: still avoid auto-admin (manual creation should set metadata)
    resolved := 'client';
    pwd_change := true;
  ELSE
    -- Org already has an admin: never assign admin from metadata
    IF incoming IN ('client', 'sourcer', 'manager', 'copywriter') THEN
      resolved := incoming::public.user_role;
    ELSE
      resolved := 'client';
    END IF;
    pwd_change := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, require_password_change)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    resolved,
    pwd_change
  );
  RETURN NEW;
END;
$$;

-- Bootstrap RPC: sign-up disabled in product — always false (kept for backwards-compatible callers)
CREATE OR REPLACE FUNCTION public.bootstrap_signup_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;
