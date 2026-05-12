-- Allow managers to update profile fields for any user.
-- App-level guard (assertAdminOrManager) prevents assigning role='manager'.
-- Existing DB trigger blocks admin promotion regardless.
CREATE POLICY "profiles_update_manager"
  ON public.profiles FOR UPDATE
  USING  (public.get_my_role() = 'manager')
  WITH CHECK (public.get_my_role() = 'manager');

COMMENT ON POLICY "profiles_update_manager" ON public.profiles IS
  'Managers may UPDATE any profile row; role-to-manager guard lives in the server action.';
