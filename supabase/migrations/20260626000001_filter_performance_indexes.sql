-- Performance indexes for all filtered listing pages.
-- Adds pg_trgm GIN indexes (ilike '%q%' searches) and missing composite btree indexes.
-- All are IF NOT EXISTS — safe to apply on top of any existing state.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── orders ────────────────────────────────────────────────────────────────

-- site_domain ilike '%q%' search (btree cannot satisfy contains pattern)
CREATE INDEX IF NOT EXISTS idx_orders_site_domain_trgm
  ON public.orders USING gin (site_domain gin_trgm_ops);

-- publish_date equality filter
CREATE INDEX IF NOT EXISTS idx_orders_publish_date
  ON public.orders (publish_date)
  WHERE publish_date IS NOT NULL;

-- staff view: status filter + created_at DESC sort (complements idx_orders_status)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);

-- copywriter filter + sort (complements partial idx_orders_copywriter_active)
CREATE INDEX IF NOT EXISTS idx_orders_copywriter_created
  ON public.orders (copywriter_id, created_at DESC)
  WHERE copywriter_id IS NOT NULL;

-- per-user list + sort (complements idx_orders_user_status)
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON public.orders (user_id, created_at DESC);

-- ─── invoices ──────────────────────────────────────────────────────────────

-- order_id FK column had no index; needed for joins and pre-filter lookups
CREATE INDEX IF NOT EXISTS idx_invoices_order_id
  ON public.invoices (order_id);

-- invoice-status pre-filter in orders list: status → order_id index-only scan
CREATE INDEX IF NOT EXISTS idx_invoices_status_order
  ON public.invoices (status, order_id);

-- combined billing_month + status filter
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month_status
  ON public.invoices (billing_month, status)
  WHERE billing_month IS NOT NULL;

-- amount range queries (gte / lte)
CREATE INDEX IF NOT EXISTS idx_invoices_amount
  ON public.invoices (amount);

-- invoice_number ilike '%q%' (existing btree only helps prefix; trgm handles contains)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_trgm
  ON public.invoices USING gin (invoice_number gin_trgm_ops)
  WHERE invoice_number IS NOT NULL;

-- ─── sites ─────────────────────────────────────────────────────────────────

-- multi-column ilike '%q%' search (existing domain_fts is tsvector, not trgm)
CREATE INDEX IF NOT EXISTS idx_sites_domain_trgm
  ON public.sites USING gin (domain gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sites_keywords_trgm
  ON public.sites USING gin (keywords_relevance gin_trgm_ops)
  WHERE keywords_relevance IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_description_trgm
  ON public.sites USING gin (description gin_trgm_ops)
  WHERE description IS NOT NULL;

-- ─── profiles ──────────────────────────────────────────────────────────────

-- trigram indexes enable DB-side name/email search (currently in-memory after auth merge)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops)
  WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON public.profiles USING gin (email gin_trgm_ops)
  WHERE email IS NOT NULL;
