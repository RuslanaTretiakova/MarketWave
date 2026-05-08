-- Fix site status transition trigger to use current enum values.
-- The enum was renamed from pending_review -> pending, but the transition
-- function still referenced pending_review in some environments.

CREATE OR REPLACE FUNCTION public.enforce_site_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status::TEXT
    WHEN 'pending' THEN ARRAY['needs_changes', 'active', 'archived']
    WHEN 'needs_changes' THEN ARRAY['active', 'archived']
    WHEN 'active' THEN ARRAY['needs_changes', 'archived']
    WHEN 'archived' THEN ARRAY['active']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid site status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
