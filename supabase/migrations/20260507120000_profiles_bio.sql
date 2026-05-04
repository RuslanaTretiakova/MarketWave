-- Optional profile bio (settings UI).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN public.profiles.bio IS
  'Optional short profile bio for the signed-in user; editable in profile settings.';
