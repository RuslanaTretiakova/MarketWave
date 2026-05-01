CREATE TABLE public.sites (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain                    TEXT NOT NULL UNIQUE,
  status                    public.site_status NOT NULL DEFAULT 'pending_review',
  category_id               INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  dr                        SMALLINT CHECK (dr >= 0 AND dr <= 100),
  price                     NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  link_type                 public.link_type NOT NULL DEFAULT 'dofollow',
  requirements              TEXT,
  description               TEXT,
  contact_info              TEXT,
  keywords_relevance        TEXT,
  organic_keywords_count    INTEGER CHECK (organic_keywords_count >= 0),
  organic_traffic_count     INTEGER CHECK (organic_traffic_count >= 0),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
