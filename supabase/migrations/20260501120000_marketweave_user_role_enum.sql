-- MarketWeave: align user_role labels (must commit before new values appear in later migrations)
-- Idempotent: fresh DBs may already ship without `moderator`; replays / partial applies must not fail.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_enum e
    INNER JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.user_role RENAME VALUE 'moderator' TO 'manager';
  END IF;
END $$;

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sourcer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'copywriter';
