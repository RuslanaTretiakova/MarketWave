-- Fix profiles_update_own RLS: the WITH CHECK self-referential subquery caused
-- silent UPDATE failures (0 rows updated, no error) in Supabase/PostgREST context.
-- Role-change protection moves entirely to the trigger.

-- ─── 1. Fix WITH CHECK — remove the self-referential subquery ─────────────────

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── 2. Extend role-change trigger to cover ALL role changes (not just to admin)

CREATE OR REPLACE FUNCTION public.profiles_block_admin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(auth.role()::text, '') = 'authenticated' THEN
    RAISE EXCEPTION 'Role cannot be changed via the API.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
