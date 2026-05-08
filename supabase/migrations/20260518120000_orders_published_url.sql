-- Capture the live URL where an order was placed so manager/admin can prove placement
-- and clients can click through. Required when an order reaches `published` status.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS published_url TEXT;

-- Enforce: once an order is at `published` (or beyond), `published_url` must be set.
-- The trigger applies on UPDATE OF status; checking here as a CHECK constraint avoids
-- backfill failures because `status = 'published'` cannot exist yet without the new column.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_published_url_required;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_published_url_required
  CHECK (
    status NOT IN ('published', 'completed')
    OR (published_url IS NOT NULL AND length(btrim(published_url)) > 0)
  );

COMMENT ON COLUMN public.orders.published_url IS
  'Live URL where the placement was published; required when status is published or completed.';
