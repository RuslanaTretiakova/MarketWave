-- When a sourcer updates their listing, clear admin needs-changes feedback (same as needs_changes_* audit fields).

CREATE OR REPLACE FUNCTION public.sites_enforce_sourcer_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND public.get_my_role() = 'sourcer' THEN
    NEW.sourcer_id := auth.uid();
    NEW.status := 'pending'::public.site_status;
  END IF;

  IF TG_OP = 'UPDATE'
     AND public.get_my_role() = 'sourcer'
     AND OLD.sourcer_id IS NOT DISTINCT FROM auth.uid() THEN
    NEW.status := 'pending'::public.site_status;
    NEW.needs_changes_by := NULL;
    NEW.needs_changes_at := NULL;
    NEW.needs_changes_comment := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
