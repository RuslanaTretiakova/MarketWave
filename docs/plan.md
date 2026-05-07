# Full App Build Plan — Link-Building Marketplace

## Context

This is a link-building marketplace where **sourcers** submit sites → **admin** approves them → **clients** browse the catalog, add to cart, and place orders → **copywriters** handle content → **clients** approve → **admin** marks invoices paid.

The DB schema, auth system, site management, user management, categories, profile, and marketing landing page are all **complete**. The remaining work is the purchase flow (cart → checkout → orders), the order lifecycle (status transitions, copywriter assignment, change requests), invoices, and real dashboard data.

---

## Stack

- **Next.js** 16.2.4 (App Router) · **React** 19.2.4 · **TypeScript** 5.x strict
- **Supabase** (`@supabase/ssr` ^0.10.2 · `@supabase/supabase-js` ^2.105.1)
- **Tailwind CSS** ^4 · **shadcn** ^4.6.0 (base-nova)
- **Path alias:** `@/` → project root

---

## What's Already Done

| Feature                                                     | Status  |
| ----------------------------------------------------------- | ------- |
| Auth (login, invite, password reset, first-login)           | ✅ Done |
| Site management (create, edit, catalog, status transitions) | ✅ Done |
| Category management (admin CRUD)                            | ✅ Done |
| User management (invite, ban, reassign, profile edit)       | ✅ Done |
| Profile + avatar upload                                     | ✅ Done |
| Marketing landing page                                      | ✅ Done |
| AppShell (sidebar, header, user menu)                       | ✅ Done |
| Error logging (client-error API + server auth logging)      | ✅ Done |
| DB schema (all tables, RLS, triggers)                       | ✅ Done |
| DB migration: copywriter RLS policies                       | ✅ Done |
| Cart UI + lib                                               | ✅ Done |
| Checkout flow                                               | ✅ Done |
| Orders list (all roles)                                     | ✅ Done |
| Order detail page                                           | ✅ Done |
| Order status transition actions                             | ✅ Done |
| Copywriter assignment                                       | ✅ Done |
| Invoice actions (admin)                                     | ✅ Done |
| Change requests UI                                          | ✅ Done |
| Dashboard with real data                                    | ✅ Done |
| Role-filtered sidebar nav                                   | ✅ Done |

**Remaining (P3):**

- Payment webhook (`app/api/webhooks/payment/route.ts`)
- `(staff)` route group layout
- Transactional email Edge Function

---

## Architecture Rules

- **Server Components** by default; `'use client'` only for interactivity
- **Server Actions** for mutations; `adminClient` for privileged writes (orders, invoices, cross-user profile reads)
- `createClient` (from `lib/supabase/server.ts`) for reads in Server Components — RLS enforces visibility
- **All Server Actions go in `lib/`**, not in `app/`
- **Supabase clients:**
  - `lib/supabase/client.ts` — Client Components only
  - `lib/supabase/server.ts` — Server Components, most Server Actions
  - `lib/supabase/admin.ts` — Bypass RLS (orders, invoices, cross-user reads) — never import in client code
- **Tailwind v4**: `bg-(--token)` not `bg-[var(--token)]`; spacing tokens: `p-inset`, `gap-block`, `py-section`, `py-layout`, `py-hero`

---

## DB Schema (Quick Reference)

### Tables

| Table                      | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `profiles`                 | User identity + role (no `public.users` — identities are `auth.users` + `public.profiles`) |
| `categories`               | Site categories (admin-managed)                                                            |
| `sites`                    | Link opportunities submitted by sourcers                                                   |
| `site_countries`           | Many-to-many: sites ↔ countries                                                            |
| `site_languages`           | Many-to-many: sites ↔ languages                                                            |
| `carts`                    | One per user (1:1 with profiles)                                                           |
| `cart_items`               | Items in cart; `publish_date` nullable                                                     |
| `orders`                   | Core business entity with full site snapshot                                               |
| `invoices`                 | 1:1 with orders; auto-created by DB trigger                                                |
| `change_requests`          | Client change requests on orders                                                           |
| `error_logs`               | App/auth error logging                                                                     |
| `admin_invite_rate_events` | Rate limiting for admin invites                                                            |
| `auth_audit_log`           | Invite/auth audit trail                                                                    |
| `public_rate_limit_events` | Generic rate limiting                                                                      |

### Enums

```
user_role:              client | admin | sourcer | manager | copywriter
order_status:           new | in_progress | content_sent | needs_changes | content_approved | published | completed | canceled
invoice_status:         pending | paid | overdue | canceled
site_status:            active | inactive | pending_review | needs_changes | approved | archived
change_request_status:  open | resolved | dismissed
link_type:              dofollow | nofollow | sponsored | ugc
```

### DB Triggers (do not re-implement in app code)

- One cart per user (UNIQUE on `carts.user_id`)
- Same site can't be in a cart twice (UNIQUE on `cart_items(cart_id, site_id)`)
- Adding an inactive site to cart raises an exception
- Order status transitions enforced by trigger — invalid transitions raise `P0001`
- Invoice auto-created on order insert
- Order → `completed` when invoice → `paid`
- `profiles` auto-created on `auth.users` insert; cart auto-created on profile insert

### Order Status Flow

```
new → in_progress → content_sent → content_approved → published → completed
                                 ↘ needs_changes → in_progress (loop)
new → canceled
```

---

## Roles & Access Control

| Role         | Description                                           |
| ------------ | ----------------------------------------------------- |
| `admin`      | Full access; single admin enforced by DB unique index |
| `manager`    | Read all non-archived; update orders/invoices         |
| `sourcer`    | Create/edit own site listings                         |
| `copywriter` | Read access; assigned to orders                       |
| `client`     | Own data + active site catalog                        |

### Role-Based Feature Matrix

| Feature             | client             | admin        | manager          | sourcer          | copywriter    |
| ------------------- | ------------------ | ------------ | ---------------- | ---------------- | ------------- |
| Cart page           | Full               | Hidden       | Hidden           | Hidden           | Hidden        |
| Checkout            | Yes                | —            | —                | —                | —             |
| Orders list         | Own                | All          | All              | —                | Assigned only |
| Order detail        | Own                | Any          | Any              | —                | Assigned only |
| Start order         | —                  | Yes          | Yes              | —                | —             |
| Mark content sent   | —                  | —            | —                | —                | Own assigned  |
| Approve content     | Own `content_sent` | —            | —                | —                | —             |
| Request changes     | Own `content_sent` | —            | —                | —                | —             |
| Assign copywriter   | —                  | Yes          | Yes              | —                | —             |
| Mark published      | —                  | Yes          | Yes              | —                | —             |
| Mark invoice paid   | —                  | Yes          | —                | —                | —             |
| Cancel order        | Own `new`          | Any          | Any              | —                | —             |
| Dashboard stats     | Personal           | Full         | Full             | Sourcing         | Assigned      |
| Site catalog        | Active only        | All statuses | All non-archived | Own non-archived | —             |
| User management     | —                  | Yes          | —                | —                | —             |
| Category management | —                  | Yes          | —                | —                | —             |

### Sidebar Nav per Role

| Role         | Nav items                                              |
| ------------ | ------------------------------------------------------ |
| `client`     | Dashboard · Site catalog · Cart · Orders               |
| `admin`      | Dashboard · Users · Categories · Site catalog · Orders |
| `manager`    | Dashboard · Site catalog · Orders                      |
| `sourcer`    | Dashboard · Site catalog                               |
| `copywriter` | Dashboard · Orders                                     |

---

## File Structure (Implemented)

### DB Migrations

```
supabase/migrations/
  20260430000001_create_enums.sql
  20260430000002_create_profiles.sql
  20260430000003_create_categories.sql
  20260430000004_create_sites.sql
  20260430000005_create_site_countries_languages.sql
  20260430000006_create_carts.sql
  20260430000007_create_orders.sql
  20260430000008_create_invoices.sql
  20260430000009_create_change_requests.sql
  20260430000010_create_error_logs.sql
  20260430000011_create_indexes.sql
  20260430000012_create_functions_triggers.sql
  20260430000013_create_rls_policies.sql
  20260501120000_marketweave_user_role_enum.sql
  20260501120001_marketweave_bootstrap_and_rls.sql
  20260502120000_single_admin_invite_auth.sql
  ... (subsequent migrations)
  20260515120000_orders_copywriter_select.sql   ← copywriter RLS policies
```

### Lib — Data Loaders

```
lib/
  cart/
    load-cart.ts              loadCart, loadCartWithTotal
  orders/
    load-orders.ts            loadOrdersPage (paginated, role-aware)
    load-order-detail.ts      loadOrderDetail (full detail + invoice + CRs)
    load-copywriter-options.ts loadCopywriterOptions (adminClient)
    order-status-labels.ts    ORDER_STATUS_LABEL, ORDER_STATUS_CHIP
  invoices/
    invoice-status-labels.ts  INVOICE_STATUS_LABEL, INVOICE_STATUS_CHIP
  dashboard/
    load-dashboard-stats.ts   loadDashboardStats (role-specific parallel queries)
```

### Lib — Server Actions

```
lib/
  cart/
    cart-actions.ts           removeCartItem, updateCartItemPublishDate, clearCart
  orders/
    create-orders-action.ts   createOrdersFromCart (adminClient insert + snapshot)
    order-actions.ts          startOrder, markContentSent, approveContent,
                              requestChanges, resumeOrder, markPublished, cancelOrder
    assign-copywriter-action.ts  assignCopywriter
    resolve-change-request-action.ts  resolveChangeRequest, dismissChangeRequest
  invoices/
    invoice-actions.ts        markInvoicePaid, markInvoiceOverdue, cancelInvoice
  sites/
    site-actions.ts           createSite, updateSite, changeSiteStatus, addSiteToCart
  auth/
    invite-actions.ts         inviteTeamMember, resendTeamInvite
    password-actions.ts       submitSetPasswordAction
    password-reset-actions.ts requestPasswordResetAction
    user-admin-actions.ts     updateTeamMemberProfile, setTeamMemberBanned,
                              previewDisableUser, disableTeamMemberAfterConfirmation,
                              activateTeamMember
  categories/
    category-admin-actions.ts createCategory, updateCategory
  profile/
    update-own-profile.ts     updateOwnProfile
    avatar-own-actions.ts     uploadOwnAvatar, removeOwnAvatar
```

### Components

```
components/
  cart/
    cart-item-row.tsx         Row: domain, DR, date input, remove button
    cart-view.tsx             Full cart with total + checkout CTA
    checkout-view.tsx         Read-only summary + confirm button
  orders/
    orders-list.tsx           Paginated table with search/status filter
    order-detail-view.tsx     Full detail: summary, snapshot, invoice, actions, CRs
    order-status-actions.tsx  Role-gated buttons with confirm dialogs
    change-requests-list.tsx  List with resolve/dismiss for staff
    assign-copywriter-select.tsx  Dropdown for admin/manager
  sites/
    sites-catalog.tsx         Browsable catalog with filters
    site-listing-form.tsx     Create/edit form
    site-detail-toolbar.tsx   Status action buttons
    site-change-status-dialog.tsx  Confirm dialog pattern
  settings/
    users-management.tsx      User admin table
    user-detail-client.tsx    User detail/edit
    categories-management.tsx Category admin table
    profile-view.tsx          Profile display + edit
  app-shell/
    app-shell.tsx, app-header.tsx, app-sidebar.tsx, app-user-menu.tsx
  auth/
    login-form.tsx, forgot-password-form.tsx, set-password-form.tsx, ...
  marketing/
    landing-hero.tsx, features-grid.tsx, how-it-works.tsx, ...
  ui/
    button, card, dialog, dropdown-menu, form, form-control, input,
    label, scroll-area, select, separator, sheet, skeleton, sonner, table, textarea
```

### Pages

```
app/
  (marketing)/
    page.tsx                  Landing page
  (app)/
    layout.tsx                Auth guard + AppShell
    dashboard/page.tsx        Role-specific stats dashboard
    sites/
      page.tsx                Catalog list (paginated + filters)
      new/page.tsx            Create site (sourcer)
      [siteId]/page.tsx       Site detail
      [siteId]/edit/page.tsx  Edit site (sourcer/admin)
    cart/
      page.tsx                Cart (client only)
      checkout/page.tsx       Checkout confirm
    orders/
      page.tsx                Orders list (role-filtered)
      [orderId]/page.tsx      Order detail
    settings/
      page.tsx                Settings hub
      profile/page.tsx        Profile settings
      users/
        page.tsx              User management (admin)
        [userId]/page.tsx     User detail (admin)
      categories/page.tsx     Category management (admin)
  auth/
    login/page.tsx
    forgot-password/page.tsx
    callback/page.tsx
    first-login-password/page.tsx
    update-password/page.tsx
  api/
    client-error/route.ts     Error ingestion endpoint
    webhooks/payment/         (P3 — not yet implemented)
  maintenance/page.tsx
  404/page.tsx
```

---

## Implementation Details

### Cart → Checkout Flow

**`createOrdersFromCart()`** — the critical checkout action:

1. Verify `role === 'client'`
2. Read cart items with full site join via `createClient` (RLS auto-scopes to own cart)
3. Validate: cart not empty; all sites still `active`
4. `adminClient.from('orders').insert(...)` — one row per cart item, copying ALL site snapshot columns at purchase time
5. DB trigger auto-creates invoice — do NOT create manually
6. `adminClient` delete cart_items
7. Return `{ ok: true; orderIds }` or `{ ok: false; message }`

**Why `adminClient` for insert**: Clients have no direct `INSERT` policy on `orders` — this is by design per `AGENTS.md`. Only Server Actions with service role can create orders.

**Order snapshot columns** (copied from live site at checkout, never re-joined for display):
`site_domain`, `site_dr`, `site_category`, `site_countries[]`, `site_languages[]`, `site_link_type`, `site_requirements`, `site_description`, `site_contact_info`, `site_keywords_relevance`, `site_organic_keywords_count`, `site_organic_traffic_count`

### Profile Joins in Staff Views

`profiles.SELECT` is admin-only for cross-user reads (RLS). For staff order views that need client/copywriter names:

- Use `adminClient.from('profiles').select('id, full_name').in('id', [...userIds])` in `load-orders.ts` and `load-order-detail.ts`
- Only do this for `role === 'admin' || role === 'manager'` paths

### Order Status Transitions (Server)

```
startOrder:        new → in_progress        admin/manager
markContentSent:   in_progress → content_sent   copywriter (must be assigned)
approveContent:    content_sent → content_approved  client (own order)
requestChanges:    content_sent → needs_changes     client (own order) + inserts change_request
resumeOrder:       needs_changes → in_progress  admin/manager
markPublished:     content_approved → published  admin/manager
cancelOrder:       new → canceled              client (own) or admin/manager (any)
```

DB trigger `enforce_order_status_transition` validates all transitions — surface `P0001` as friendly toast.

### Invoice Lifecycle

- Auto-created by DB trigger when order is inserted (`handle_new_order`)
- Order → `completed` when invoice → `paid` (trigger `handle_invoice_paid`)
- Admin actions: `markInvoicePaid` (updates `status = 'paid'`, `paid_at`), `markInvoiceOverdue`, `cancelInvoice`
- Never create invoices manually in app code

### Dashboard Stats (Role-Specific)

All stats use parallel `Promise.all` with `{ count: 'exact', head: true }` queries:

| Role       | Stat 1           | Stat 2               | Stat 3               |
| ---------- | ---------------- | -------------------- | -------------------- |
| client     | Orders in flight | Completed orders     | Awaiting approval    |
| admin      | Active orders    | Sites in review      | Pending invoices     |
| manager    | Active orders    | Awaiting action      | Open change requests |
| copywriter | Assigned orders  | Pending content send | Completed            |
| sourcer    | Sites submitted  | Active sites         | Pending review       |

---

## P3 — Remaining Work

### Payment Webhook

**`app/api/webhooks/payment/route.ts`**

- `POST`; validate `PAYMENT_WEBHOOK_SECRET` header
- `adminClient.from('invoices').update({ status: 'paid', paid_at: now() })`
- DB trigger handles `orders → completed` automatically
- Returns `200 { ok: true }` on success; `401` bad secret; `400` bad payload; `500` DB error

### Staff Route Group

**`app/(staff)/layout.tsx`**

- Assert `role in ['admin', 'manager']`; `notFound()` otherwise
- Placeholder for future analytics dashboards, bulk order management

### Email Notifications

Transactional emails (order placed, content sent, invoice paid) need:

1. A Supabase Edge Function triggered by DB webhooks or called from Server Actions
2. A third-party transactional email API (Resend, Postmark, etc.)
3. HTML templates in `supabase/templates/`

Auth emails (invite, password reset) already work via Supabase built-in.

---

## Key Constraints & Notes

1. **No new DB columns needed for P1/P2** — all columns exist. Only 3 RLS policies were added.
2. **Single admin** — enforced by partial unique index. Bootstrap via Supabase Dashboard user metadata: `{ "is_bootstrap_admin": true, "role": "admin" }`.
3. **`require_password_change`** — invited users must set a password before accessing the app. Cleared by `submitSetPasswordAction` via `adminClient`.
4. **Public sign-up disabled** — all users are invited by admin via `inviteTeamMember`.
5. **`NEXT_PUBLIC_SITE_URL`** — must match Supabase redirect allow-list for invite/reset links.
6. **Type regeneration** — after any schema change: `npx supabase gen types typescript --local > lib/supabase/types/database.types.new.ts`
7. **Never edit pushed migrations** — create new ALTER migrations instead.
8. **Lint + format on commit** — Husky + lint-staged runs Prettier + ESLint. Run `npm run lint` once after all edits in a task are complete.

---

## Verification Checklist (End-to-End)

### Cart → Checkout → Orders (client path)

- [ ] Log in as client. Browse `/sites` — only `active` sites visible.
- [ ] Add site to cart — toast appears.
- [ ] Go to `/cart` — item visible, publish date input works, price total shows.
- [ ] Remove item → disappears. Re-add.
- [ ] Go to `/cart/checkout` — read-only summary, total correct.
- [ ] Click "Confirm order" → redirected to `/orders`.
- [ ] New order at `new` status with invoice `pending`. Cart is empty.

### Order lifecycle (staff + copywriter + client)

- [ ] Log in as admin. Go to `/orders` — new order visible.
- [ ] Click order → assign copywriter from select dropdown.
- [ ] Click "Start order" → status `in_progress`.
- [ ] Log in as copywriter — only assigned order visible.
- [ ] Click "Mark content sent" → status `content_sent`.
- [ ] Log in as client — order shows "Content sent".
- [ ] Click "Approve content" → status `content_approved`.
- [ ] Log in as admin. Click "Mark published" → status `published`.
- [ ] Click "Mark invoice paid" → invoice `paid`, order auto → `completed`.

### Change request path

- [ ] Reset order to `content_sent`. Log in as client.
- [ ] Click "Request changes", enter comment → order → `needs_changes`, change request created.
- [ ] Log in as manager — see change request, click "Resolve".
- [ ] Click "Resume order" → back to `in_progress`.

### Dashboard

- [ ] Log in as each role — snapshot cards show real numbers.
- [ ] Create 3 orders — admin shows "3 active orders".

### RLS boundary checks

- [ ] Client accessing another client's order detail → 404.
- [ ] Copywriter accessing `/cart` → not-available or 404.
- [ ] Sourcer at `/orders` → empty list (RLS returns nothing).
- [ ] Client at `/settings/users` → 404 (admin-only).
