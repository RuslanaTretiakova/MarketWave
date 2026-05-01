# Database Structure

## Overview

- **Type**: PostgreSQL (via Supabase)
- **Source of truth**: SQL migrations in [`supabase/migrations/`](supabase/migrations/)
- **Access**: Supabase clients in [`lib/supabase/`](lib/supabase/) (see [AGENTS.md](AGENTS.md) for which client to use)

Do not rely on this file for column-level detail when migrations disagree—**migrations always win**.

## Public tables (quick ref)

Same list as [AGENTS.md](AGENTS.md) DB quick ref:

`profiles` · `categories` · `sites` · `site_countries` · `site_languages` · `carts` · `cart_items` · `orders` · `invoices` · `change_requests` · `error_logs`

## Authentication (managed by Supabase)

- **`auth.users`** — identities and sessions (not defined in app migrations)
- **`public.profiles`** — app profile row per user (`id` references `auth.users`)

Triggers create a profile (and related cart) when a new auth user is created—see migration `20260430000012_create_functions_triggers.sql`.

## Development notes

- Apply schema changes only via new migration files in `supabase/migrations/`
- Test locally (`npx supabase db reset`) before pushing to remote
- Regenerate TypeScript types after schema changes (command in [AGENTS.md](AGENTS.md))

---

### Update this file when:

- You need a high-level summary of new domains; keep the definitive schema in migrations
