-- Managers need the full user directory (read-only in UI for most actions); replaces
-- the narrower assigned-clients-only policy.

DROP POLICY IF EXISTS "profiles_select_manager_assigned_clients" ON public.profiles;

CREATE POLICY "profiles_select_manager_directory"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'manager');

COMMENT ON POLICY "profiles_select_manager_directory" ON public.profiles IS
  'Managers may SELECT any profile row for Settings → Users (same scope as admin for listing).';
