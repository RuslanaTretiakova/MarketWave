-- Admin/manager feedback shown to sourcer when a listing is marked needs_changes.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS needs_changes_comment TEXT;

COMMENT ON COLUMN public.sites.needs_changes_comment IS
  'Required context from admin/manager when status is set to needs_changes; cleared when resolved (e.g. approved).';
