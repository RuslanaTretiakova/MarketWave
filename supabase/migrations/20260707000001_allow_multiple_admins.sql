-- Allow more than one admin profile.
-- Drops the partial unique index that enforced a single admin row.
-- The profiles_block_admin_promotion trigger still prevents API-level
-- promotion; service_role assignments (seed, manual DB ops) are unaffected.

DROP INDEX IF EXISTS public.profiles_single_admin_idx;
