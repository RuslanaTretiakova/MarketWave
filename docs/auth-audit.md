# Auth Flow Analysis & Optimization Plan

## Context

Audit the existing Supabase + Next.js 16 authentication system to surface security issues, bad practices, and UX problems. This is not a feature build — it is a targeted review with a fix list ordered by severity.

---

## Architecture Overview (what exists)

| Layer                    | File                                                                               | Role                                             |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| Edge proxy / middleware  | `proxy.ts` → `lib/supabase/proxy-session.ts`                                       | Cookie refresh, session validation, route guards |
| Supabase clients         | `lib/supabase/{client,server,admin}.ts`                                            | Browser / server / service-role clients          |
| Auth callback            | `app/auth/callback/page.tsx`                                                       | Code exchange, OTP verify, hash-token fallback   |
| First-login password     | `app/auth/first-login-password/page.tsx` + `components/auth/set-password-form.tsx` | Invite completion                                |
| Password/invite actions  | `lib/auth/{password-actions,invite-actions,password-reset-actions}.ts`             | Server actions                                   |
| Route guard              | `app/(app)/layout.tsx`                                                             | App-shell: checks user + require_password_change |
| Cached user context      | `lib/supabase/cached-app-user.server.ts`                                           | Deduped getUser + profiles per request           |
| Safe redirects           | `lib/auth-redirect.ts`                                                             | Open-redirect prevention                         |
| Auth path classification | `lib/auth/auth-paths.ts`                                                           | Decides which paths are public vs protected      |
| User admin               | `lib/auth/user-admin-actions.ts`                                                   | Ban/disable/update team members                  |

---

## Issues Found — Ordered by Severity

### CRITICAL

#### C1 — `httpOnly: false` on session cookies

- **File:** `lib/supabase/proxy-session.ts` line ~25
- **Problem:** Auth tokens (access + refresh) are readable by JavaScript. Any XSS vulnerability anywhere in the app can steal the full session.
- **Fix:** Set `httpOnly: true` in the cookie options passed to `createServerClient`. The `@supabase/ssr` package accepts a `cookieOptions` override.
- **Why it matters:** This is the most impactful change — it converts a token-theft XSS into at most a session-riding XSS (much harder to exploit remotely).

---

### HIGH

#### H1 — `signOut()` after password set is fire-and-forget (no await, no error handling)

- **File:** `components/auth/set-password-form.tsx` lines ~62–68
- **Problem:** `supabase.auth.signOut()` is called without `await`. If it fails silently the user stays signed in while being redirected to `/auth/login` — leaving a ghost session active.
- **Fix:** `await supabase.auth.signOut()` and handle the error (show a toast or force `window.location.assign('/auth/login')` regardless, but log the failure).

#### H2 — Hash-based implicit flow fallback in auth callback

- **File:** `app/auth/callback/page.tsx` lines ~74–93
- **Problem:** The callback accepts `access_token` + `refresh_token` from the URL hash and calls `setSession()`. Hash tokens are exposed to browser history, the referrer header, and browser extensions. This is the deprecated implicit flow.
- **Fix:** Determine if any real flow still produces hash tokens. If not (Supabase modern PKCE only produces `code`), remove the `setSession()` branch entirely. If invite/recovery links still produce hash tokens (older Supabase config), enable PKCE in the Supabase dashboard so all flows use `code`.
- **Why it matters:** Hash tokens can be logged by analytics scripts and browser extensions.

---

### MEDIUM

#### M1 — `require_password_change` redirect loop on `/auth/login`

- **File:** `lib/supabase/proxy-session.ts` lines ~118–123
- **Problem:** An authenticated user with `require_password_change = true` visiting `/auth/login` gets redirected to `safeReturnPath` (which defaults to `/dashboard`), then the app-shell layout immediately redirects them back to `/auth/first-login-password`. The double-redirect is harmless but creates a confusing flicker.
- **Fix:** In `proxy-session.ts`, after confirming the user is authenticated, check `requirePasswordChange` before redirecting away from `/auth/login`. If true, redirect directly to `/auth/first-login-password`.

#### M2 — Rate-limit failures silently allow requests

- **File:** `lib/auth/public-rate-limit.ts` (error path)
- **Problem:** When the rate-limit Supabase query fails (DB unreachable, env var missing), the code logs a warning and allows the request through. This is a reasonable fail-open choice but it could mask a misconfigured `RATE_LIMIT_SECRET` or broken DB connection for days.
- **Fix:** Add a structured log (or error monitoring event) distinguishing "rate limit check failed — allowing" from normal traffic, so ops can detect if rate limiting silently breaks.

---

### LOW

#### L1 — Hardcoded admin email in login form

- **File:** `components/auth/login-form.tsx` line ~41
- **Problem:** `const adminEmail = 'ruslana.tretiakova@archysoft.com'` is checked with `NEXT_PUBLIC_ENABLE_TEST_LOGIN`. If that env var is ever accidentally set in a staging/production env, the test panel exposes a valid admin email.
- **Fix:** Move the email to an env var (`NEXT_PUBLIC_TEST_ADMIN_EMAIL`) or remove the test panel entirely (use a separate `.env.test` or seed script). At minimum ensure `NEXT_PUBLIC_ENABLE_TEST_LOGIN` is always absent from non-dev deployments.

#### L2 — No explicit session-age check before password change

- **File:** `lib/auth/password-actions.ts`
- **Problem:** The action calls `getUser()` to confirm the session is valid, but doesn't verify the session was established recently. A user could theoretically have the password-change form open for hours with a refreshed-but-old session.
- **Fix:** Low priority — session refresh in middleware keeps sessions current. Only relevant if session hijacking is a concern at the time of use. If so, add `reauthenticateWithPassword` or check `session.user.last_sign_in_at`.

---

## What Is Already Well-Implemented (do not change)

- `getUser()` used everywhere server-side (not the deprecated `getSession()`) ✓
- `require_password_change` enforced at 3 independent layers: DB trigger, middleware, app-shell layout ✓
- Open-redirect prevention via `safeReturnPath()` and `safePostAuthRedirect()` allowlist ✓
- Service role key never leaked to client (`admin.ts` lazy-proxy + server-only imports) ✓
- Role-based action guards (`assertAdmin`, `assertAdminOrManager`) on all privileged mutations ✓
- Per-IP + per-email HMAC rate limiting on password reset ✓
- React.cache deduplication for `getUser` + `profiles` per request ✓
- Stale/cross-project cookie detection and clearing ✓
- `force-dynamic` / `no-store` on app shell layout ✓

---

## Fix Priority Order

| #   | ID  | File                                    | Effort                                              |
| --- | --- | --------------------------------------- | --------------------------------------------------- |
| 1   | C1  | `lib/supabase/proxy-session.ts`         | S (add `cookieOptions`)                             |
| 2   | H1  | `components/auth/set-password-form.tsx` | XS (add await + handler)                            |
| 3   | H2  | `app/auth/callback/page.tsx`            | M (audit + remove or keep based on Supabase config) |
| 4   | M1  | `lib/supabase/proxy-session.ts`         | S (one extra condition)                             |
| 5   | M2  | `lib/auth/public-rate-limit.ts`         | XS (improve error log)                              |
| 6   | L1  | `components/auth/login-form.tsx`        | XS (move to env var)                                |

---

## Verification

After fixes:

1. **C1** — Open DevTools → Application → Cookies. Supabase `sb-*-auth-token` cookies must show `HttpOnly` flag. Confirm `document.cookie` does not expose them.
2. **H1** — Simulate a failed `signOut` (network throttle) and confirm the user still lands on `/auth/login`.
3. **H2** — Check Supabase Dashboard → Auth → Settings: confirm "Authorization code flow (PKCE)" is enabled and "Implicit flow" is disabled. If so, remove `setSession()` branch and test invite + recovery links end-to-end.
4. **M1** — As an invited user (with `require_password_change = true`), visit `/auth/login` directly and confirm you land on `/auth/first-login-password` in a single redirect (no flicker through `/dashboard`).
5. **M2** — Review structured logs after deployment to confirm rate-limit failures surface as distinguishable events.

---

## Full Analysis — Raw Findings

### Agent 1: Core Auth Flow (proxy, clients, redirects, sign-out)

#### Session & Cookie Management

**proxy-session.ts** implements middleware-based session refresh on every request:

- Detects stale/cross-project cookies and clears them via `clearStaleSessionCookies()` — matches `sb-*-auth-token` pattern, sets `maxAge: 0`
- `refreshTokenMissingRecovery()` redirects to login with error message when session is invalid
- Cache headers set on protected routes: `Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0`
- Cookies use `sameSite: 'lax'` and conditionally `secure` for HTTPS

**ISSUE:** `httpOnly: false` at line ~25 — session cookies accessible to JavaScript.

#### Auth Redirects & Route Protection

**`lib/auth-redirect.ts` — `safeReturnPath()`:**

- Rejects `null`, arrays, non-string values
- Only allows paths starting with `/` (relative)
- Rejects protocol-relative redirects (`//`)
- Default fallback to `/dashboard`

**`safePostAuthRedirect()`** — stricter allowlist for `/auth/callback`: only `/dashboard`, `/auth/update-password`, `/auth/first-login-password`

**`app/(app)/layout.tsx` app shell:**

- Checks user existence → `notFound()` (404 not redirect)
- Checks `require_password_change` → redirects to first-login-password
- Uses `force-dynamic` and `force-no-store`

#### OAuth / Magic-Link Callback

**`app/auth/callback/page.tsx`:**

- `exchangeCodeForSession(code)` for authorization code (PKCE)
- `verifyOtp()` for email OTP / magic links with type detection
- `setSession()` fallback for hash-based implicit flow tokens
- Flow detection: `flow=recovery` → `/auth/update-password`, `flow=invite` → `/auth/first-login-password`
- All errors redirect to login with `error=auth`
- Proper cancellation handling (AbortController / unmount guard)

**`auth-session-hash-handler.tsx`:** bounces implicit flow hash tokens to `/auth/callback` to prevent tokens lingering in URL hash.

#### Role-Based Access Control

**`lib/auth/user-admin-actions.ts`:**

- `assertAdmin()` / `assertAdminOrManager()` guard all privileged mutations
- Managers cannot invite other managers (privilege escalation blocked)
- Self-modification guards: can't ban/disable yourself
- `disableTeamMemberAfterConfirmation()` checks for active orders/sites before disable

#### Error Mapping

**`map-auth-error.ts`** handles: rate limiting (429 + text patterns), banned/disabled accounts, invalid credentials, email not confirmed, weak password, user already exists, invalid redirect URLs, user not found, expired sessions/JWTs. Falls back to generic message.

#### Rate Limiting

- Password reset: per-IP + per-email HMAC-SHA256 fingerprint (10/hour each)
- Set password: per user ID (20 per 15 min)
- Client error POST: per IP (40/min)
- Falls back to `SUPABASE_SERVICE_ROLE_KEY` if `RATE_LIMIT_SECRET` not set
- Error path: silently allows with console.warn — see M2

#### Session Caching

**`lib/supabase/cached-app-user.server.ts` — `getCachedAppUserContext()`:**

- Uses `React.cache` to dedupe `getUser()` + `profiles` query per request
- Single round-trip for app shell layout and all nested pages
- Caches: `require_password_change`, `full_name`, `role`, `avatar_url`
- Graceful fallback if Supabase env missing

#### Client Sign-Out

**`lib/auth/client-sign-out.ts`:**

- Calls `supabase.auth.signOut()` then `window.location.assign()`
- `finally` block ensures redirect even if sign-out fails — but no `await`, so sign-out may be in-flight when redirect fires (see H1)

---

### Agent 2: Invite Flow, Password Change, DB Triggers, Callback Detail

#### Invite Flow — `lib/auth/invite-actions.ts`

**`inviteTeamMember()`:**

- Calls `adminClient.auth.admin.inviteUserByEmail()`
- Requires admin or manager role
- Rate limited via `checkAndRecordAdminInviteRateLimit()`
- Sets user metadata: `role`, `full_name`, `is_bootstrap_admin: false`
- Redirect in invite email: `/auth/callback?next=/auth/first-login-password&flow=invite`
- Blocks if `NEXT_PUBLIC_SITE_URL` not configured

**`resendTeamInvite()`:**

- Only allowed when `require_password_change = true` OR user has never signed in
- Retrieves existing metadata to preserve role on resend

#### require_password_change — 3-Layer Enforcement

**Layer 1 — DB trigger** (`supabase/migrations/20260502120000_single_admin_invite_auth.sql`):

- `profiles_enforce_require_password_change` trigger
- Blocks any authenticated user from clearing the flag
- Only service_role (`adminClient`) can set it to `false`
- Raises EXCEPTION on violation

**Layer 2 — Middleware** (`lib/supabase/proxy-session.ts` lines ~109–116):

- If `requirePasswordChange = true` and path is not a completion path → redirect to `/auth/first-login-password`
- If password change complete and user is on `/auth/first-login-password` → redirect to `/dashboard`

**Layer 3 — App shell** (`app/(app)/layout.tsx` lines ~38–40):

- Checks `profile?.require_password_change` → redirects to `/auth/first-login-password`
- Catches any bypass attempt that made it past middleware

#### handle_new_user Trigger

- **Bootstrap admin** (`is_bootstrap_admin: true` + `role: 'admin'`): `require_password_change = false`
- **All other invited roles** (client, sourcer, manager, copywriter): `require_password_change = true`
- No invite can become admin (bootstrap admin only, created manually)
- Cart auto-created on profile insert via separate trigger `on_profile_created`

#### submitSetPasswordAction — `lib/auth/password-actions.ts`

- Authenticated server action (calls `getUser()` to confirm session)
- Updates password via `adminClient.auth.admin.updateUserById()`
- Clears `require_password_change = false` via service role (bypasses DB trigger guard)
- Rate limited: 3 attempts per 15 minutes per user ID
- Calls `ensureOnboardingChatsForUser()` after success

**After password set in `components/auth/set-password-form.tsx`:**

- First-login mode: signs out user + redirects to `/auth/login` — no `await` on signOut (see H1)
- Recovery mode: redirects to success message page then login

#### Auth Callback Detail

```
Code present?
  → exchangeCodeForSession(code)        # PKCE — modern, secure
OTP type in params?
  → verifyOtp({ token, type, email })   # magic links / email OTP
Hash contains access_token?
  → setSession(access_token, refresh_token)  # implicit flow — deprecated (see H2)
```

After session established:

- Detects `flow=invite` → `/auth/first-login-password`
- Detects `flow=recovery` → `/auth/update-password`
- Default → `safePostAuthRedirect(next)` with allowlist

#### Security Notes from Agent 2

- No explicit re-authentication challenge before password change (L2 above)
- `require_password_change` users hitting `/auth/login` trigger double-redirect (M1 above)
- Hash-based token fallback exposes tokens to browser history / extensions (H2 above)
- `signOut()` fire-and-forget after password set (H1 above)
