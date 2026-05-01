# Database Structure

## Overview

- **Type**: PostgreSQL (via Supabase)
- **Source of truth**: SQL migrations in [`supabase/migrations/`](supabase/migrations/)
- **Access**: Supabase clients in [`lib/supabase/`](lib/supabase/) (see [AGENTS.md](AGENTS.md) for which client to use)

Do not rely on this file for column-level detail when migrations disagree—**migrations always win**.

## Public tables (quick ref)

Same list as [AGENTS.md](AGENTS.md) DB quick ref:

`profiles` · `auth_audit_log` · `categories` · `sites` · `site_countries` · `site_languages` · `carts` · `cart_items` · `orders` · `invoices` · `change_requests` · `error_logs`

## Authentication (managed by Supabase)

There is **no `public.users` table** in this project. Application-owned identity and roles live in **`public.profiles`** only.

- **`auth.users`** — Supabase Auth’s internal identity store (email, password hash, session primitives). You do not create migrations for it; `profiles.id` is a foreign key to `auth.users(id)`.
- **`public.profiles`** — one row per person (`id` = same UUID as `auth.users.id`). Columns like `role`, `full_name`, and `require_password_change` live here. **Email is not duplicated on `profiles`**; it stays on `auth.users`, which is why server-only **Auth Admin** APIs (for example `listUsers`) are used when the flow needs to look someone up by email (e.g. resend invite).

Triggers create a profile (and related cart) when a new auth user is created—see migration `20260430000012_create_functions_triggers.sql` and `20260501120001_marketweave_bootstrap_and_rls.sql` / `20260502120000_single_admin_invite_auth.sql`.

## Manual organization admin

1. In **Supabase Dashboard → Authentication → Users → Add user**, create the admin with email/password (or magic link).
2. Set **Raw user meta data** to include at least: `{ "is_bootstrap_admin": true, "role": "admin", "full_name": "Admin Name" }` so the `handle_new_user` trigger creates `profiles` with `role = admin` and `require_password_change = false`.
3. Disable **public sign-up** in Auth settings; use **in-app Settings → Team invitations** (admin only) for everyone else. When the app is live, invite operational accounts (e.g. ruslana.tretiakova@archysoft.com) from that screen — do not commit credentials in the repo.

## Environment

- **`NEXT_PUBLIC_SITE_URL`** — canonical public origin (no trailing slash) used in invite and password-reset links. Must be listed in Supabase **Redirect URLs** for production. Custom HTML for transactional mail lives in `supabase/templates/` (`invite`, `recovery`, `magic_link`); mirror those templates in the hosted project under **Authentication → Email templates**. For production deliverability, configure **SMTP** in the Supabase dashboard (not committed in this repo).

## Development notes

- Apply schema changes only via new migration files in `supabase/migrations/`
- **Local full migrate + seed:** start **Docker Desktop**, then from the repo root run `npx supabase db reset` (or `npm run db:reset`). In `supabase/config.toml`, email `content_path` values use **`supabase/templates/*.html`** relative to the **repository root** so the CLI can resolve them on Windows and macOS (files live in [`supabase/templates/`](supabase/templates/)).
- **Remote:** `npx supabase db push` after linking the project (see Supabase CLI docs).
- Regenerate TypeScript types after schema changes (command in [AGENTS.md](AGENTS.md))
- **CI / no Docker:** run `npm run lint` and `npm run build` to verify the app; database migrations are validated when you run `db reset` or `db push` with the CLI.

---

### Update this file when:

- You need a high-level summary of new domains; keep the definitive schema in migrations
