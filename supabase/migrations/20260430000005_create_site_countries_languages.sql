-- ISO 3166-1 alpha-2 country codes per site
CREATE TABLE public.site_countries (
  site_id   UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  country   TEXT NOT NULL,
  PRIMARY KEY (site_id, country)
);

-- BCP-47 language codes per site
CREATE TABLE public.site_languages (
  site_id   UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  language  TEXT NOT NULL,
  PRIMARY KEY (site_id, language)
);
