# Project documentation

Start with **[docs/ai/AGENTS.md](ai/AGENTS.md)** for stack pins, Supabase clients, RLS, migrations, Tailwind v4 rules, and agent workflow. Root [AGENTS.md](../AGENTS.md) is a stub linking there.

**AI tooling map:** [ai/README.md](ai/README.md) (Cursor vs Claude indexes).

| Doc                                            | Purpose                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [stack.md](stack.md)                           | Dependencies and tooling (mirrors `package.json`)                                                     |
| [database.md](database.md)                     | DB overview, admin bootstrap, local/remote workflow (migrations are authoritative)                    |
| [ui.md](ui.md)                                 | Design tokens, spacing scale, component placeholders                                                  |
| [skills.md](skills.md)                         | Index for **`docs/ai/claude/skills/`** (Claude library; Cursor rules use same paths) + repo overrides |
| [planning-checklist.md](planning-checklist.md) | Checklist before features/refactors                                                                   |
| [auth.md](auth.md)                             | Auth token lifecycle, RBAC roles, RLS policy matrix, and auth error logging                           |
| [audit-backlog.md](audit-backlog.md)           | Prioritized refactors from audits (updated as you fix items)                                          |

Claude skill library: [`ai/claude/skills/`](ai/claude/skills/) (per-skill `SKILL.md` files).
