-- DB-level constraints and missing catalog performance indexes.

-- DR must be 0–100 (app validates, DB enforces)
ALTER TABLE public.sites
  ADD CONSTRAINT sites_dr_range CHECK (dr >= 0 AND dr <= 100);

-- Hostname format validation is handled at the app level (server action).
-- The UNIQUE constraint on domain is the important DB-level guard.

-- Catalog filter indexes
CREATE INDEX IF NOT EXISTS idx_sites_category_id ON public.sites (category_id);
CREATE INDEX IF NOT EXISTS idx_sites_price        ON public.sites (price);
CREATE INDEX IF NOT EXISTS idx_sites_dr           ON public.sites (dr);

-- Admin needs-changes queue
CREATE INDEX IF NOT EXISTS idx_sites_needs_changes_at
  ON public.sites (needs_changes_at ASC)
  WHERE status = 'needs_changes';

-- Junction table lookups by country / language (PK covers site_id-first; these cover the reverse)
CREATE INDEX IF NOT EXISTS idx_site_countries_country
  ON public.site_countries (country);

CREATE INDEX IF NOT EXISTS idx_site_languages_language
  ON public.site_languages (language);
