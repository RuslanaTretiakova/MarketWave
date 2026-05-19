-- Convert keywords_relevance from free-text to a proper text[] array.
-- Existing comma-separated values are split and trimmed on migration.
-- A generated keywords_text column is added for backward-compatible ilike catalog search.

ALTER TABLE public.sites
  ALTER COLUMN keywords_relevance
  TYPE text[]
  USING (
    CASE
      WHEN keywords_relevance IS NULL OR trim(keywords_relevance) = '' THEN NULL
      ELSE
        array_remove(
          string_to_array(
            regexp_replace(trim(keywords_relevance), '\s*,\s*', ',', 'g'),
            ','
          ),
          ''
        )
    END
  );

-- IMMUTABLE wrapper required for GENERATED ALWAYS AS (array_to_string is STABLE).
CREATE OR REPLACE FUNCTION public.keywords_array_to_text(arr text[])
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT array_to_string(arr, ',') $$;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS keywords_text text
  GENERATED ALWAYS AS (public.keywords_array_to_text(keywords_relevance)) STORED;

CREATE INDEX IF NOT EXISTS idx_sites_keywords_text
  ON public.sites (keywords_text);
