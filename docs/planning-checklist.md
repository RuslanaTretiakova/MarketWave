# Feature / refactor planning checklist

Use this before sizeable work so implementation matches [AGENTS.md](ai/AGENTS.md) and [skills.md](skills.md).

## 1. Data and mutations

- [ ] **Read path:** Prefer **Server Components** + `lib/supabase/server.ts` (RLS). Avoid client `useEffect` + `fetch` for initial data.
- [ ] **Write path:** Prefer **Server Actions** with the correct client (`server` vs `admin` per [AGENTS.md](ai/AGENTS.md)). No direct client inserts for privileged flows (e.g. orders).
- [ ] **Client-only needs:** If real-time or heavy client cache is required, justify **TanStack Query** (or similar) and add the dependency explicitly; otherwise stay RSC-first.

## 2. Routing and boundaries

- [ ] **New routes:** Under `app/`; default to server components; add `'use client'` only for interactivity.
- [ ] **Loading / errors:** Consider `loading.tsx`, `error.tsx`, and `Suspense` where UX matters.
- [ ] **Session / redirects:** Remember **proxy.ts** + `lib/supabase/proxy-session.ts` for edge session refresh (not `middleware.ts`).

## 3. UI and styling

- [ ] **Spacing / theme:** Prefer design tokens from [ui.md](ui.md) and `@theme` in `app/globals.css` (`p-inset`, `gap-section`, etc.).
- [ ] **Tailwind v4:** Follow [AGENTS.md](ai/AGENTS.md) (parentheses form for CSS variables, avoid problematic arbitrary patterns).

## 4. Accessibility and semantics

- [ ] See [modern-accessible-html-jsx/SKILL.md](ai/claude/skills/modern-accessible-html-jsx/SKILL.md): labels, focus, landmarks, heading order.

## 5. Security

- [ ] **Boundaries:** Validate on server; never trust client-only checks for authorization.
- [ ] **Secrets:** No service role or private keys in client bundles; RLS is the default enforcement.
- [ ] See [web-security/SKILL.md](ai/claude/skills/web-security/SKILL.md) for XSS, cookies, CSP-minded patterns.

## 6. Schema and types

- [ ] If the DB changes: new migration under `supabase/migrations/`, then regenerate types (command in [AGENTS.md](ai/AGENTS.md)).

## 7. Skills to skim (pick what applies)

- [ ] [skills.md](skills.md) — index and repo overrides
- [ ] Relevant `SKILL.md` under `docs/ai/claude/skills/` for this change (React, Next, Tailwind, TS, a11y, security, browser APIs)
