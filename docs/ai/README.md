# AI assistant documentation

This folder groups **human-facing** maps for tooling. The **actual** instruction files stay where each product expects them (see below).

## Cursor

- **Index:** [cursor/README.md](cursor/README.md) — lists [`.cursor/rules`](../../.cursor/rules) (`.mdc` files). Cursor loads those automatically; do not move them.
- **Always-on rule:** [.cursor/rules/linkbuilding-context.mdc](../../.cursor/rules/linkbuilding-context.mdc)

## Claude

- **Index:** [claude/README.md](claude/README.md) — how root [CLAUDE.md](../../CLAUDE.md) ties to the repo.
- **Canonical instructions:** **[AGENTS.md](AGENTS.md)** in this folder (Claude loads it via `@docs/ai/AGENTS.md`). Root **[../../AGENTS.md](../../AGENTS.md)** is a stub for old bookmarks and Cursor settings.

## Shared (both tools)

| Resource                                               | Role                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                 | Full agent contract (stack, Supabase, RLS, migrations, Tailwind v4, workflow) |
| [../../AGENTS.md](../../AGENTS.md)                     | Stub pointing here                                                            |
| [claude/skills/](claude/skills/)                       | Per-topic `SKILL.md` files (**Claude** library; Cursor rules link here too)   |
| [docs/skills.md](../skills.md)                         | Index + **this repo’s** overrides (RSC-first, `proxy.ts`, `@theme`)           |
| [docs/planning-checklist.md](../planning-checklist.md) | Checklist before sizeable work                                                |
| [docs/README.md](../README.md)                         | All human project docs                                                        |

## What not to duplicate

Do not copy `.mdc` bodies here—only link to [`.cursor/rules`](../../.cursor/rules) so there is a single source of truth.
