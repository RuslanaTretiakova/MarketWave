# Cursor — project rules

Cursor reads Markdown-with-frontmatter rules from **[`.cursor/rules`](../../../.cursor/rules)**. Paths below are from the repo root.

## Always applied

| File                                                                                        | Purpose                                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`.cursor/rules/linkbuilding-context.mdc`](../../../.cursor/rules/linkbuilding-context.mdc) | [docs/ai/AGENTS.md](../AGENTS.md) first, [docs/skills.md](../../skills.md), [docs/planning-checklist.md](../../planning-checklist.md); no TanStack unless justified |

## Scoped (globs)

| File                                                                  | `globs`                                                               | Purpose                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| [react-components.mdc](../../../.cursor/rules/react-components.mdc)   | `**/*.{tsx,jsx}`                                                      | React + a11y skills, RSC-first                           |
| [next-app-router.mdc](../../../.cursor/rules/next-app-router.mdc)     | `app/**/*`                                                            | Next App Router, `proxy.ts`                              |
| [typescript.mdc](../../../.cursor/rules/typescript.mdc)               | `**/*.{ts,tsx}`                                                       | Clean TypeScript skill                                   |
| [styling-tailwind.mdc](../../../.cursor/rules/styling-tailwind.mdc)   | `**/*.css`                                                            | Tailwind skill + AGENTS v4                               |
| [tables-pagination.mdc](../../../.cursor/rules/tables-pagination.mdc) | `components/settings/**`, `app/**/settings/**`, `**/*management*.tsx` | New data tables must paginate (10 / URL / shared footer) |
| [security.mdc](../../../.cursor/rules/security.mdc)                   | `lib/**/*action*.ts`                                                  | Server Actions security                                  |
| [security-api.mdc](../../../.cursor/rules/security-api.mdc)           | `app/api/**/*.ts`                                                     | Route handlers                                           |
| [security-profile.mdc](../../../.cursor/rules/security-profile.mdc)   | `lib/profile/**/*.ts`                                                 | Profile mutations                                        |

## Shared context with Claude

- [AGENTS.md](../AGENTS.md) (canonical; also root stub `AGENTS.md`)
- [`docs/ai/claude/skills/`](../claude/skills/) and [docs/skills.md](../../skills.md)

Parent map: [docs/ai/README.md](../README.md).
