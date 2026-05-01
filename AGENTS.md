# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Stack

Pinned versions from `package.json` (keep in sync when upgrading):

- **Next.js** 16.2.4 (App Router) · **React** 19.2.4 · **TypeScript** 5.x strict
- **Routing proxy:** root [`proxy.ts`](proxy.ts) (Next 16 file convention); Supabase session + auth gates live in [`lib/supabase/proxy-session.ts`](lib/supabase/proxy-session.ts) — do not add root `middleware.ts`
- **Supabase** — `@supabase/ssr` ^0.10.2 · `@supabase/supabase-js` ^2.105.1 — Postgres + Auth + RLS (no backend framework)
- **Tailwind CSS** ^4 · **shadcn** ^4.6.0 (base-nova style via `components.json`)
- **Path alias:** `@/` → project root
- **Spacing (padding / gap):** `inset` · `block` · `section` · `layout` · `hero` · `hero-wide` — utilities like `p-inset`, `py-hero`; see [UI.md](UI.md) and `@theme` in [app/globals.css](app/globals.css).

## Supabase Clients — use the right one

| File                     | Use when                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `lib/supabase/client.ts` | Client Components (`'use client'`)                                                                           |
| `lib/supabase/server.ts` | Server Components, most Server Actions                                                                       |
| `lib/supabase/admin.ts`  | Server Actions that need to bypass RLS (order creation, privileged writes) — **never import in client code** |

After any schema change regenerate types. The app imports generated types from **`lib/supabase/types/database.types.new.ts`** (see `lib/supabase/types/index.ts`); `database.types.ts` in that folder is a placeholder—do not overwrite it with codegen.

```
npx supabase gen types typescript --local > lib/supabase/types/database.types.new.ts
```

Use the **Supabase CLI** (install globally or run via `npx supabase …`). Local Postgres major version is **17** (`supabase/config.toml`); match remote when using `db push`.

## DB Schema (quick ref)

Tables: `profiles` · `categories` · `sites` · `site_countries` · `site_languages` · `carts` · `cart_items` · `orders` · `invoices` · `change_requests` · `error_logs`

Key rules baked into the DB (do not re-implement in app code):

- One cart per user (UNIQUE on `carts.user_id`)
- Same site can't be in a cart twice (UNIQUE on `cart_items(cart_id, site_id)`)
- Adding an inactive site to cart raises an exception (DB trigger)
- Order status transitions are enforced by a DB trigger — invalid transitions raise `P0001`
- Invoice auto-created on order insert (trigger); order → `completed` when invoice → `paid` (trigger)
- `profiles` auto-created on `auth.users` insert (trigger); cart auto-created on profile insert (trigger)

Order status flow: `new → in_progress → content_sent → [content_approved | needs_changes] → published → completed` · also `new → canceled`

Roles (stored in `profiles.role`, read via `public.get_my_role()`): `admin` · `client` · `sourcer` · `manager` · `copywriter`

## Mutations — placement rules

- **Direct Supabase client** — reads from Server Components (RLS handles visibility)
- **Server Actions** with `adminClient` — `createOrdersFromCart`, `rejectOrder`, `approveOrder`, `cancelOrder` (multi-step, need service role)
- **Route Handlers** (`app/api/`) — external webhooks only (`/api/webhooks/payment`)

## Security

- RLS is on every table — security is enforced at the DB level, not the app level
- **Bootstrap sign-up:** `public.bootstrap_signup_allowed()` (SECURITY DEFINER) exposes whether `profiles` is empty—used for the first-admin gate. After the org exists, disable public sign-up in the Supabase Auth dashboard for defense in depth.
- Clients cannot INSERT orders directly — only via Server Action with `adminClient`
- Clients cannot change their own `role` (enforced by RLS WITH CHECK)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client

## Migrations

All migrations live in `supabase/migrations/`. Never edit a migration that has been pushed to remote — create a new one with ALTER statements.

```bash
npx supabase db reset      # rebuild local DB from scratch (or: supabase db reset)
npx supabase db push       # deploy to remote (or: supabase db push)
```

## Code style

- Prettier + ESLint run on commit (lint-staged) and on push (pre-push hook)
- Run `npm run format` to format, `npm run lint` to check
