# Claude — project context

## Entry point

Root **[CLAUDE.md](../../../CLAUDE.md)** is the hook Claude Code (and similar) load from the repository root. It should stay small and point at the real contract.

## Canonical instructions

**[AGENTS.md](../AGENTS.md)** in this folder (`docs/ai/`) is the single source for:

- Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn pins and links
- Supabase clients (`lib/supabase/*`), RLS, migrations, type generation
- Security and mutation placement
- Tailwind v4 token rules

**[CLAUDE.md](../../../CLAUDE.md)** at repo root uses `@docs/ai/AGENTS.md` so sessions load this file. Root **[AGENTS.md](../../../AGENTS.md)** remains a short stub for compatibility.

## Skills and planning (same as Cursor)

| Resource                                                  | Role                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [skills/](skills/)                                        | Per-topic `SKILL.md` library (this folder — primary home for Claude skills)          |
| [docs/skills.md](../../skills.md)                         | When to open which skill + **repo overrides** (RSC-first data, `proxy.ts`, `@theme`) |
| [docs/planning-checklist.md](../../planning-checklist.md) | Pre-flight checklist for features/refactors                                          |

## Cursor-specific layout

If you also use Cursor, rule files live under [`.cursor/rules`](../../../.cursor/rules); see [docs/ai/cursor/README.md](../cursor/README.md).

Parent map: [docs/ai/README.md](../README.md).
