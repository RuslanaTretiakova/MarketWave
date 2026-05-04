-- Only organization admin may read other users' profile rows; own row still via profiles_select_own.

DROP POLICY IF EXISTS "profiles_select_admin_mod" ON public.profiles;

CREATE POLICY "profiles_select_admin_mod"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');
