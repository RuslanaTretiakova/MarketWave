-- Align site_status enum and workflow with spec:
-- pending_review → pending, approved removed (approve goes directly to active),
-- top_countries column added, dr made NOT NULL.

-- ─── 1. Rename pending_review → pending ─────────────────────────────────────
ALTER TYPE public.site_status RENAME VALUE 'pending_review' TO 'pending';

-- ─── 2. Migrate approved → active (approved is no longer a valid workflow state) ──
UPDATE public.sites SET status = 'active' WHERE status = 'approved';

-- ─── 3. Add top_countries column ────────────────────────────────────────────
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS top_countries TEXT;

COMMENT ON COLUMN public.sites.top_countries IS 'Primary countries this site targets (free text, e.g. "US, GB, CA").';

-- ─── 4. Make dr NOT NULL (backfill any nulls first) ─────────────────────────
UPDATE public.sites SET dr = 0 WHERE dr IS NULL;
ALTER TABLE public.sites ALTER COLUMN dr SET NOT NULL;

-- ─── 5. Update sourcer defaults trigger: uses 'pending' now ─────────────────
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
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 6. Update audit-field validation trigger: drop the approved check ───────
-- The 'approved' status no longer exists in the workflow. Keep only the
-- needs_changes guard. The active-requires-approved_by constraint is enforced
-- at the application level to avoid breaking legacy rows that reached 'active'
-- via the old activate transition without audit fields.
CREATE OR REPLACE FUNCTION public.enforce_site_status_audit_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'needs_changes'::public.site_status THEN
    IF NEW.needs_changes_by IS NULL OR NEW.needs_changes_at IS NULL THEN
      RAISE EXCEPTION 'needs_changes requires needs_changes_by and needs_changes_at' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
