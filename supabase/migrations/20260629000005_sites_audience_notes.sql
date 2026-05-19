-- Rename top_countries → audience_notes to clarify that this is an informal
-- free-text field (e.g. "US 60%, GB 20%"), not the structured site_countries relation.

ALTER TABLE public.sites RENAME COLUMN top_countries TO audience_notes;
