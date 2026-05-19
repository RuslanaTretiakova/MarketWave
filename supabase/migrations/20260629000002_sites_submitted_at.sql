-- Add submitted_at: timestamp of when the site last entered the pending review queue.
-- Used to sort the admin moderation queue by submission order.

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Backfill: treat creation time as original submission time
UPDATE public.sites SET submitted_at = created_at WHERE submitted_at IS NULL;

ALTER TABLE public.sites ALTER COLUMN submitted_at SET NOT NULL;
ALTER TABLE public.sites ALTER COLUMN submitted_at SET DEFAULT now();

-- Partial index: admin moderation queue ordered by submission time
CREATE INDEX IF NOT EXISTS idx_sites_submitted_at_pending
  ON public.sites (submitted_at ASC)
  WHERE status = 'pending';

-- Update sites_enforce_sourcer_defaults to also reset submitted_at when
-- a sourcer edits their listing (triggering a return to pending review).
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
    NEW.submitted_at := now();
    NEW.needs_changes_by := NULL;
    NEW.needs_changes_at := NULL;
    NEW.needs_changes_comment := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
