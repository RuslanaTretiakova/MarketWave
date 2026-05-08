-- Order action matrix support:
-- 1) Add explicit order-level editable fields for client/admin edits.
-- 2) Allow admin-only status override from the app (via authenticated JWT role).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS anchor_text TEXT,
  ADD COLUMN IF NOT EXISTS target_url TEXT,
  ADD COLUMN IF NOT EXISTS client_notes TEXT;

COMMENT ON COLUMN public.orders.anchor_text IS
  'Client-provided anchor text for the placement.';
COMMENT ON COLUMN public.orders.target_url IS
  'Client-provided target URL for the placement.';
COMMENT ON COLUMN public.orders.client_notes IS
  'Additional client requirements/notes for the order.';

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_next TEXT[];
  actor_role public.user_role;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  actor_role := public.get_my_role();

  -- Admin-only manual override path.
  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status
    WHEN 'new'              THEN ARRAY['in_progress', 'canceled']
    WHEN 'in_progress'      THEN ARRAY['content_sent']
    WHEN 'content_sent'     THEN ARRAY['content_approved', 'needs_changes']
    WHEN 'needs_changes'    THEN ARRAY['in_progress', 'content_sent']
    WHEN 'content_approved' THEN ARRAY['published']
    WHEN 'published'        THEN ARRAY[]::TEXT[]
    WHEN 'completed'        THEN ARRAY[]::TEXT[]
    WHEN 'canceled'         THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
