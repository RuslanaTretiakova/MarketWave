# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Stack

Authoritative dependency and tooling list: **[../stack.md](../stack.md)**.

Quick pins: **Next.js** 16.2.4 (App Router) · **React** 19.2.4 · **TypeScript** 5.x strict · **Supabase** (`@supabase/ssr` ^0.10.2 · `@supabase/supabase-js` ^2.105.1) · **Tailwind CSS** ^4 · **shadcn** ^4.6.0 (base-nova via `components.json`) · **Path alias:** `@/` → project root.

**Edge proxy:** root [`../../proxy.ts`](../../proxy.ts) (Next 16 — replaces `middleware.ts`); delegates to [`../../lib/supabase/proxy-session.ts`](../../lib/supabase/proxy-session.ts) (`updateSession`) for cookie refresh and auth redirects.

**Spacing (padding / gap):** `inset` · `block` · `section` · `layout` · `hero` · `hero-wide` — utilities like `p-inset`, `py-hero`; see [../ui.md](../ui.md) and `@theme` in [`../../app/globals.css`](../../app/globals.css).

**Skills + planning:** [../skills.md](../skills.md) (repo overrides for RSC-first data, `proxy.ts`, Tailwind v4). New features: [../planning-checklist.md](../planning-checklist.md). **AI tooling indexes:** [README.md](README.md).

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

Tables: `profiles` · `admin_invite_rate_events` · `auth_audit_log` · `categories` · `sites` · `site_countries` · `site_languages` · `carts` · `cart_items` · `orders` · `invoices` · `change_requests` · `error_logs` — there is **no** `public.users` table; identities are `auth.users` (Supabase) + `public.profiles` (app).

Narrative, admin bootstrap, email templates, and local DB workflow: **[../database.md](../database.md)**.

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
- **Route Handlers** (`app/api/`) — external integrations and **narrow internal APIs** audited for auth and data exposure — e.g. `/api/webhooks/payment`, `POST /api/client-error` (server-side logging with `adminClient`). Prefer Server Actions for app CRUD unless the caller must be raw `fetch` (webhooks, beacons).

## Security

- RLS is on every table — security is enforced at the DB level, not the app level
- **`profiles` SELECT:** Each user may read their own row; **`admin`** may read **any** other user's `profiles` row. **`manager`** may read **any** `profiles` row for **Settings → Users** (same listing scope as admin; admin-only mutations stay behind `listMode === 'admin'` in the UI). Operational roles otherwise use their own row and non-profile tables per existing policies.
- **Single admin:** One `profiles.role = 'admin'` row (partial unique index). Create that user in **Supabase Dashboard** with **User metadata** JSON: `{ "is_bootstrap_admin": true, "role": "admin", "full_name": "Your Name" }` so `handle_new_user` assigns admin and `require_password_change = false`. Everyone else is invited (`inviteUserByEmail`) from **Settings** in the app. `public.bootstrap_signup_allowed()` always returns `false` (RPC kept for compatibility); disable public sign-up in the Supabase Auth dashboard for defense in depth.
- **First sign-in:** Invited users have `profiles.require_password_change = true` until they set a password; cleared only via **service role** (Server Action + `adminClient`), enforced by a DB trigger.
- **Email links:** Set **`NEXT_PUBLIC_SITE_URL`** to your deployed origin so invite/reset `redirectTo` URLs match the Supabase redirect allow-list (see `.env.example`).
- Clients cannot INSERT orders directly — only via Server Action with `adminClient`
- Clients cannot change their own `role` (enforced by RLS WITH CHECK)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client

## Migrations

All migrations live in `supabase/migrations/`. Never edit a migration that has been pushed to remote — create a new one with ALTER statements.

```bash
npx supabase db reset      # rebuild local DB from scratch (or: supabase db reset) — requires Docker; or: npm run db:reset
npx supabase db push       # deploy to remote (or: supabase db push) — or: npm run db:push
```

## Tailwind CSS (v4)

Do **not** reintroduce patterns the linter flags in favor of built-in scale or v4 shorthand:

- **CSS variables:** use `bg-(--my-token)`, `text-(--my-token)`, `from-(--my-token)`, etc. — **not** `bg-[var(--my-token)]` or `text-[var(--my-token)]`. For `hsl(var(--x))` channel tokens, prefer `bg-hsl-(--x)` (or a theme utility like `bg-foreground` when it maps to the same color).
- **Theme colors:** prefer utilities such as `bg-cta`, `text-cta-foreground`, `bg-foreground`, `text-background`, `ring-offset-sidebar`, `shadow-soft` instead of arbitrary `[var(...)]` / `[hsl(var(...))]` when equivalent.
- **Spacing / size:** prefer scale classes (`size-4.5`, `p-6`, etc.) — **not** arbitrary rem equivalents like `size-[1.125rem]` when a named step exists.

Marketing tokens live in `app/globals.css` (`--marketing-*`, `--shadow-*`, etc.); `@theme` aliases use the parentheses form above. Prefer `--accent-teal-strong` with `bg-(--accent-teal-strong)` / `text-(--accent-teal-strong)` for the deep teal headline and logo tint (do not use `--marketing-teal-deep` in utilities — Tailwind’s CSS emitter can mishandle it on Windows).

**Page container max-widths:**

| Page type                         | Max-width   | Examples                                                        |
| --------------------------------- | ----------- | --------------------------------------------------------------- |
| List / data-table pages           | `max-w-6xl` | OrdersList, InvoicesList, EarningsView                          |
| Detail / form pages               | `max-w-4xl` | OrderDetailView, InvoiceDetailView, SiteListingForm             |
| Narrow form / checkout            | `max-w-2xl` | ProfileView, CheckoutView                                       |
| Card-shell full-column components | none        | SitesCatalog, OrdersList, UsersManagement, CategoriesManagement |

Card-shell components (those that own their own border/bg container) do not add a max-width — the parent layout column constrains them.

**Page heading component:** use `<PageHeader>` from `components/ui/page-header.tsx` for all authenticated page titles. Props: `title` (required), `description` (text subtitle), `meta` (below-title slot for badges/chips), `action` (right-side slot for primary actions). Do **not** write the `<h2 className="text-2xl font-semibold tracking-tight">` + `<p className="text-muted-foreground …">` pattern inline.

**Filter bar inputs:** use `<FilterInput>` and `<FilterSelect>` from `components/ui/filter-bar.tsx` for search/filter controls. These apply the same `h-10 rounded-full` pill style as `FormControlInput`. Use native `<select>` via `FilterSelect` (not the Base-UI `Select`) so `onChange` triggers immediate URL navigation without a submit step.

## Code style

- Prettier + ESLint run on commit (lint-staged) and on push (pre-push hook)
- Run `npm run format` to format, `npm run lint` to check
- **Agent workflow:** During a multi-step task or plan, **do not** run `npm run lint` after every change. Run **`npm run lint` once** when **all** planned edits for that task are finished (unless you must run it mid-task to unblock on a specific error).
