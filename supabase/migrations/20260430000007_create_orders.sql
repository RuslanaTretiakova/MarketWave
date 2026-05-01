CREATE TABLE public.orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  -- site_id kept for joins but SET NULL on delete — snapshots are the source of truth
  site_id       UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  status        public.order_status NOT NULL DEFAULT 'new',
  publish_date  DATE,
  price         NUMERIC(10, 2) NOT NULL,

  -- Immutable snapshot of site data captured at order creation
  site_domain                   TEXT NOT NULL,
  site_dr                       SMALLINT,
  site_category                 TEXT NOT NULL,
  site_countries                TEXT[] NOT NULL DEFAULT '{}',
  site_languages                TEXT[] NOT NULL DEFAULT '{}',
  site_link_type                public.link_type NOT NULL,
  site_requirements             TEXT,
  site_description              TEXT,
  site_contact_info             TEXT,
  site_keywords_relevance       TEXT,
  site_organic_keywords_count   INTEGER,
  site_organic_traffic_count    INTEGER,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
