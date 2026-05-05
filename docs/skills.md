# Skills library (AI + humans)

**Claude-oriented library:** per-topic guidance lives under **[`docs/ai/claude/skills/`](ai/claude/skills/)** (each subfolder has a `SKILL.md` with YAML frontmatter: `name`, `description`, `triggers`). Cursor project rules link to the same paths.

When implementing or reviewing code, open the skill that matches the task. **This repository** adds the overrides below—skills stay broadly applicable; overrides avoid contradictions.

## Repository overrides

- **Data fetching:** Default to **React Server Components** and **Server Actions** with the Supabase clients in [AGENTS.md](ai/AGENTS.md). Do **not** add **TanStack Query** unless a feature explicitly needs client-side caching, background refetch, or subscriptions—then add the dependency deliberately and document why.
- **Edge session:** Auth/session refresh uses root [`proxy.ts`](../proxy.ts) (Next.js 16 convention), not `middleware.ts`. See [AGENTS.md](ai/AGENTS.md).
- **Tailwind:** Theme extension is in **[`app/globals.css`](../app/globals.css)** (`@theme`, CSS variables), not only `tailwind.config`. Follow the Tailwind v4 rules in [AGENTS.md](ai/AGENTS.md).
- **Next.js docs:** Prefer `node_modules/next/dist/docs/` for version-specific APIs (this stack pins Next 16.2.4).

## Index

| Skill              | Path                                                                                                              | Use when                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| React components   | [modern-best-practice-react-components/SKILL.md](ai/claude/skills/modern-best-practice-react-components/SKILL.md) | `.tsx` UI, state, effects, composition (apply RSC-first override above)                |
| Next.js App Router | [modern-best-practice-nextjs/SKILL.md](ai/claude/skills/modern-best-practice-nextjs/SKILL.md)                     | `app/` routes, RSC, server actions, loading/metadata (`proxy.ts` here, not middleware) |
| Tailwind           | [modern-tailwind/SKILL.md](ai/claude/skills/modern-tailwind/SKILL.md)                                             | Styling, responsive/state variants (`@theme` in globals per override)                  |
| TypeScript         | [clean-typescript/SKILL.md](ai/claude/skills/clean-typescript/SKILL.md)                                           | Types, APIs, narrowing                                                                 |
| Accessibility      | [modern-accessible-html-jsx/SKILL.md](ai/claude/skills/modern-accessible-html-jsx/SKILL.md)                       | Markup, forms, dialogs, landmarks                                                      |
| Security           | [web-security/SKILL.md](ai/claude/skills/web-security/SKILL.md)                                                   | Authz, input, server boundaries (complement RLS in [AGENTS.md](ai/AGENTS.md))          |
| Browser APIs       | [modern-browser-apis/SKILL.md](ai/claude/skills/modern-browser-apis/SKILL.md)                                     | Clipboard, observers, view transitions, native alternatives to libs                    |

### Deep reference

- [you-dont-need-useeffect.md](ai/claude/skills/modern-best-practice-react-components/references/you-dont-need-useeffect.md)

## Planning new work

Use [planning-checklist.md](planning-checklist.md) before sizeable features or refactors.
