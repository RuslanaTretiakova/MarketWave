# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** strict
- **Supabase** — Postgres + Auth + RLS (no backend framework)
- **Tailwind CSS v4** + **shadcn/ui** (base-nova style, neutral palette)
- **Path alias:** `@/` → project root

## Supabase Clients — use the right one

| File                     | Use when                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `lib/supabase/client.ts` | Client Components (`'use client'`)                                                                           |
| `lib/supabase/server.ts` | Server Components, most Server Actions                                                                       |
| `lib/supabase/admin.ts`  | Server Actions that need to bypass RLS (order creation, privileged writes) — **never import in client code** |

After any schema change regenerate types:

```
npx supabase gen types typescript --local > lib/supabase/types/database.types.ts
```

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

Roles: `client` · `admin` · `moderator` (stored in `profiles.role`, read via `public.get_my_role()`)

## Mutations — placement rules

- **Direct Supabase client** — reads from Server Components (RLS handles visibility)
- **Server Actions** with `adminClient` — `createOrdersFromCart`, `rejectOrder`, `approveOrder`, `cancelOrder` (multi-step, need service role)
- **Route Handlers** (`app/api/`) — external webhooks only (`/api/webhooks/payment`)

## Security

- RLS is on every table — security is enforced at the DB level, not the app level
- Clients cannot INSERT orders directly — only via Server Action with `adminClient`
- Clients cannot change their own `role` (enforced by RLS WITH CHECK)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client

## Migrations

All migrations live in `supabase/migrations/`. Never edit a migration that has been pushed to remote — create a new one with ALTER statements.

```bash
supabase db reset          # rebuild local DB from scratch
supabase db push           # deploy to remote
```

## Code style

- Prettier + ESLint run on commit (lint-staged) and on push (pre-push hook)
- Run `npm run format` to format, `npm run lint` to check
