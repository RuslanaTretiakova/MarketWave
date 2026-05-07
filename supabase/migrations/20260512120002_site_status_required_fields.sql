-- Validate required audit fields for site status transitions.

CREATE OR REPLACE FUNCTION public.enforce_site_status_audit_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'needs_changes'::public.site_status THEN
    IF NEW.needs_changes_by IS NULL OR NEW.needs_changes_at IS NULL THEN
      RAISE EXCEPTION 'needs_changes requires needs_changes_by and needs_changes_at' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.status = 'approved'::public.site_status THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'approved requires approved_by and approved_at' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_site_status_audit_fields ON public.sites;

CREATE TRIGGER enforce_site_status_audit_fields
  BEFORE INSERT OR UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.enforce_site_status_audit_fields();
