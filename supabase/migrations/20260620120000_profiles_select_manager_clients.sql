-- Managers may read client profiles they are assigned as account manager for (Users workspace).

CREATE POLICY "profiles_select_manager_assigned_clients"
  ON public.profiles FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND role = 'client'
    AND account_manager_id = auth.uid()
  );

COMMENT ON POLICY "profiles_select_manager_assigned_clients" ON public.profiles IS
  'Lets managers open Settings → Users for clients where they are the account manager.';
