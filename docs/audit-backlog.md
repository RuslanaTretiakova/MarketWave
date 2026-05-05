# Audit backlog (code vs skills)

Maintenance pass: **2026-05-05**. Update this file as items are fixed or reprioritized.

How to use: tackle **P1** in small PRs; **P2** when touching a file anyway; **P3** is informational.

## Summary

| Area                      | Finding                                                                                                                                       | Risk / churn |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `useEffect`               | Present in auth shell, menus, profile, errors, callback — many are browser/session concerns; review whether each can shrink or move to server | Medium       |
| Inline `onClick`          | Common in settings and menus; skill prefers named handlers when non-trivial                                                                   | Low          |
| `dangerouslySetInnerHTML` | Not found in app source (only in skill docs)                                                                                                  | —            |
| TypeScript `any`          | No app matches (comment-only false positive in `next.config.ts`)                                                                              | —            |

## `useEffect` inventory (verify necessity)

| Priority | File                                            | Notes                                                               |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| P2       | `components/auth/auth-session-hash-handler.tsx` | Auth redirect / hash parsing — likely legitimate client effect      |
| P2       | `components/settings/profile-view.tsx`          | Multiple effects — candidate for review (derive state, server data) |
| P2       | `components/layout/marketing-user-menu.tsx`     | Menu open / scroll lock — typical client                            |
| P2       | `components/app-shell/app-user-menu.tsx`        | Same                                                                |
| P3       | `components/app-shell/app-shell.tsx`            | Layout — verify                                                     |
| P3       | `app/global-error.tsx`                          | Error logging effect — usually keep                                 |
| P3       | `app/error.tsx`                                 | Same                                                                |
| P3       | `app/auth/callback/page.tsx`                    | OAuth callback — typically must stay client-side                    |

## Inline event handlers (extract when editing)

| Priority | File                                        | Count / notes                               |
| -------- | ------------------------------------------- | ------------------------------------------- |
| ~~P1~~   | `components/app-shell/app-sidebar.tsx`      | Done — named logout handler                 |
| ~~P1~~   | `components/app-shell/app-user-menu.tsx`    | Done — named navigation / sign-out handlers |
| ~~P1~~   | `components/layout/marketing-user-menu.tsx` | Done                                        |
| ~~P2~~   | `app/error.tsx`, `app/global-error.tsx`     | Done — named `handleReset`                  |

## Spacing / Tailwind (spot-check when touching UI)

Prefer tokens from [ui.md](ui.md) (`p-inset`, `gap-section`, …) over ad-hoc `p-4` where a token fits.

## Security (spot-check)

- Server Actions under `lib/auth`, `lib/profile`, `lib/errors` — already covered by Cursor rules; no `dangerouslySetInnerHTML` in app tree from this audit.
