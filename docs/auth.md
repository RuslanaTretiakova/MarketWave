# Auth, RBAC, and Error Logging

## Table of contents

1. [How authentication works](#1-how-authentication-works)
2. [Role-based access control](#2-role-based-access-control)
3. [Auth error logging](#3-auth-error-logging)

---

## 1. How authentication works

### Token pair

Supabase issues two tokens on every sign-in:

| Token           | What it is                                                                                                                | Lifetime   | Stored in |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| `access_token`  | Short-lived JWT. Contains `user.id`, `role`, `email` in its payload — no DB round-trip to verify identity.                | ~1 hour    | Cookie    |
| `refresh_token` | Opaque long-lived string. Stored server-side in Supabase. Used to obtain a new access token when the current one expires. | Days/weeks | Cookie    |

Both tokens live in HTTP cookies named `sb-<project-ref>-auth-token` (chunked as `.0`, `.1` when the payload is large). They are **never stored in `localStorage`**.

### Session lifecycle

```
Browser request
    │
    ▼
proxy.ts → updateSession()        lib/supabase/proxy-session.ts
    │
    ├─ reads both cookies from the incoming request
    ├─ calls supabase.auth.getUser()
    │     └─ access_token expired? → Supabase silently exchanges refresh_token for a new pair
    ├─ writes fresh cookie values into the response before the page renders
    └─ enforces redirects:
          • unauthenticated → /auth/login
          • require_password_change = true → /auth/first-login-password
          • already signed-in on /auth/login → /dashboard
```

The refresh happens **in the proxy on every request**, so Server Components and Server Actions always see a valid, already-refreshed session.

If the refresh token is missing or invalid (expired, wrong project, cleared server-side), the proxy clears the stale cookies and redirects to `/auth/login?error=session` instead of crashing.

### Supabase client files

| File                     | When to use                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `lib/supabase/server.ts` | Server Components, most Server Actions. Reads cookies via `next/headers`.                                  |
| `lib/supabase/client.ts` | `'use client'` components only. Reads/writes `document.cookie`. Singleton per browser tab.                 |
| `lib/supabase/admin.ts`  | Server Actions that need to bypass RLS. Uses `SUPABASE_SERVICE_ROLE_KEY`. **Never import in client code.** |

### First sign-in (invited users)

1. Admin sends invite → `adminClient.auth.admin.inviteUserByEmail()` → Supabase emails a magic link.
2. User clicks link → `/auth/callback` exchanges the OTP for a session and redirects to `/auth/first-login-password`.
3. `profiles.require_password_change = true` is set on the profile row.
4. User sets a password → `submitSetPasswordAction` calls `adminClient.auth.admin.updateUserById()` and clears `require_password_change`.
5. Proxy sees `require_password_change = false` on the next request and allows normal navigation.

---

## 2. Role-based access control

### Roles

Roles are stored in `profiles.role` as a Postgres `ENUM`:

| Role         | Who                                 | Key permissions                                            |
| ------------ | ----------------------------------- | ---------------------------------------------------------- |
| `admin`      | One per org, bootstrap-created only | Full access to everything                                  |
| `manager`    | Internal staff                      | Read all non-archived data; update orders and invoices     |
| `sourcer`    | Internal staff                      | Create and edit their own site listings                    |
| `copywriter` | Internal staff                      | Read access; assigned to orders via `orders.copywriter_id` |
| `client`     | External paying user                | Own data only + active site catalog                        |

**Single admin rule:** A partial unique index (`profiles_single_admin_idx`) enforces that only one `role = 'admin'` row can exist. A `BEFORE UPDATE` trigger blocks any authenticated JWT from promoting a user to `admin` — the only path is the bootstrap `handle_new_user` trigger or a direct service-role DB session.

### How role is checked

The DB function `get_my_role()` (`SECURITY DEFINER`) reads the caller's role from `profiles` without triggering RLS recursion:

```sql
SELECT role FROM public.profiles WHERE id = auth.uid();
```

All RLS policies call `public.get_my_role()` rather than querying `profiles` directly.

### RLS policy matrix

RLS is enabled on every table. No unauthenticated or wrong-role access reaches any row.

#### `profiles`

| Operation                | Who                                                                            |
| ------------------------ | ------------------------------------------------------------------------------ |
| SELECT own row           | every authenticated user (`auth.uid() = id`)                                   |
| SELECT other users' rows | `admin` only                                                                   |
| UPDATE                   | own non-role fields (any role); any field (`admin`)                            |
| INSERT                   | trigger only (`handle_new_user` on `auth.users` INSERT) — not callable via API |
| Promote to admin         | **blocked by trigger** for any authenticated JWT                               |

#### `categories`

| Operation  | Who                                            |
| ---------- | ---------------------------------------------- |
| SELECT     | any authenticated user (shared lookup catalog) |
| ALL writes | `admin` only                                   |

#### `sites`

| Operation | Who                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------- |
| SELECT    | `admin` = all; `manager` = all non-archived; `sourcer` = own non-archived; `client` = `active` only |
| INSERT    | `admin`; `sourcer` (own — `sourcer_id = auth.uid()`)                                                |
| UPDATE    | `admin`; `sourcer` (own, non-archived)                                                              |
| DELETE    | `admin` only                                                                                        |

A `BEFORE INSERT OR UPDATE` trigger (`sites_enforce_sourcer_defaults`) forces `sourcer_id = auth.uid()` and `status = pending_review` whenever a sourcer writes — a sourcer cannot self-approve a listing.

Country/language junction tables (`site_countries`, `site_languages`) can be mutated by `admin` directly; sourcers use the `replace_site_countries_and_languages` RPC which is `SECURITY DEFINER` and checks role internally.

#### `carts` / `cart_items`

| Operation                       | Who                                                  |
| ------------------------------- | ---------------------------------------------------- |
| SELECT carts                    | own cart; `admin/manager/sourcer/copywriter` see all |
| SELECT cart_items               | own cart's items; staff see all                      |
| INSERT/UPDATE/DELETE cart_items | own cart only                                        |

#### `orders`

| Operation               | Who                                                                      |
| ----------------------- | ------------------------------------------------------------------------ |
| SELECT                  | own orders (client); all orders (staff)                                  |
| INSERT                  | **no authenticated policy** — only via Server Action using `adminClient` |
| UPDATE: cancel          | client, own `new` orders only                                            |
| UPDATE: approve/reject  | client, own `content_sent` orders only                                   |
| UPDATE: all transitions | staff                                                                    |

Order status transitions are additionally enforced by a DB trigger (`enforce_order_status_transition`) — invalid transitions raise `P0001` regardless of role.

#### `invoices`

| Operation  | Who                                               |
| ---------- | ------------------------------------------------- |
| SELECT     | own invoices (via order ownership); staff see all |
| ALL writes | `admin` only                                      |

#### `change_requests`

| Operation | Who                                              |
| --------- | ------------------------------------------------ |
| SELECT    | own requests; staff see all                      |
| INSERT    | client, only when linked order is `content_sent` |
| UPDATE    | staff only                                       |

#### `error_logs`

| Operation | Who                                                                             |
| --------- | ------------------------------------------------------------------------------- |
| SELECT    | `admin` only                                                                    |
| INSERT    | service role only (no authenticated INSERT policy — `adminClient` bypasses RLS) |

#### `admin_invite_rate_events` / `public_rate_limit_events`

Fully locked — service role only on all operations.

---

## 3. Auth error logging

### What gets logged

Every Supabase Auth failure is captured in `error_logs` with a sanitized payload. Nothing sensitive (passwords, tokens, emails, IP addresses) is ever stored.

| Event                            | Context value                    | Logged from                                               |
| -------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Sign-in failure                  | `auth/sign-in`                   | `login-form.tsx` → `POST /api/client-error`               |
| Change credentials — verify step | `auth/change-credentials-verify` | `change-credentials-sheet.tsx` → `POST /api/client-error` |
| Change credentials — update step | `auth/change-credentials-update` | `change-credentials-sheet.tsx` → `POST /api/client-error` |
| Password reset error             | `auth/password-reset`            | `requestPasswordResetAction` → `logAuthError()`           |
| Invite error                     | `auth/invite`                    | `inviteTeamMember` → `logAuthError()`                     |
| Resend invite error              | `auth/invite-resend`             | `resendTeamInvite` → `logAuthError()`                     |
| Set password error               | `auth/set-password`              | `submitSetPasswordAction` → `logAuthError()`              |

### Two logging paths

**Server-side auth errors** (server actions) use `logAuthError()` directly:

```ts
// lib/errors/log-auth-error.ts — 'use server', uses adminClient
logAuthError({ context, message, payload: { code }, userId? })
```

**Client-side auth errors** (browser components) use a fire-and-forget `fetch`:

```ts
// lib/errors/report-auth-error-client.ts — imported in 'use client' components
reportAuthErrorClient(mapped, 'auth/sign-in')
// → POST /api/client-error  (origin-guarded, rate-limited 40/min/IP, uses adminClient)
```

### Payload sanitization

`logAuthError` strips any key named `password`, `passwd`, `pwd`, `token`, `access_token`, `refresh_token`, `secret`, `key`, `apikey`, `api_key`, or `authorization` — recursively through nested objects. Payload is truncated to 4 000 bytes. The function never throws; DB errors are swallowed with `console.error`.

Callers always pass `mapAuthError(rawError)` first. The raw `AuthError` object is never passed to the logger — only `{ code: AuthErrorCode }` goes in the payload.

### Frontend error contract

Components never see raw Supabase errors:

```
Supabase AuthError
    └─ mapAuthError(error) → { code: AuthErrorCode, message: string }
           ├─ message  displayed to the user
           └─ code     used for programmatic branching (e.g. "Resend email" link for email_not_confirmed)
```

Server actions return `{ ok: false; code: string; message: string }` on failure. Components check `res.ok` and show `res.message` — nothing else.

### Error log schema

```
error_logs
  id          BIGSERIAL PK
  level       TEXT  (info | warn | error | critical)
  context     TEXT  — e.g. "auth/sign-in"
  message     TEXT  — normalized, user-safe message
  payload     JSONB — sanitized metadata, e.g. { code: "invalid_credentials" }
  user_id     UUID  → profiles (nullable — unauthenticated events have null)
  created_at  TIMESTAMPTZ

Indexes: (context, created_at DESC), (created_at DESC)
```
