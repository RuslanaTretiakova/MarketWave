-- MarketWeave: align user_role labels (must commit before new values appear in later migrations)

ALTER TYPE public.user_role RENAME VALUE 'moderator' TO 'manager';

ALTER TYPE public.user_role ADD VALUE 'sourcer';
ALTER TYPE public.user_role ADD VALUE 'copywriter';
