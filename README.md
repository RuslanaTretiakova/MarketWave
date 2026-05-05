# linkbuilding

Internal link-building / ops workflow app (**MarketWeave** branding in UI): Next.js 16, Supabase, Tailwind 4, shadcn.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Environment** — copy [.env.example](.env.example) to `.env` and set your Supabase URL and keys (from the Supabase dashboard).
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

## Project docs

- **[docs/ai/AGENTS.md](docs/ai/AGENTS.md)** — stack pins, Supabase clients, type generation, migrations, RLS expectations (canonical; read before changing code). Root [AGENTS.md](AGENTS.md) is a compatibility stub.
- **[docs/ai/README.md](docs/ai/README.md)** — where Cursor rules vs Claude context are documented (indexes; `.mdc` rules stay in `.cursor/rules/`).
- **[docs/README.md](docs/README.md)** — index of deeper docs, skills mapping, and planning checklist.
- **[docs/skills.md](docs/skills.md)** — index for **`docs/ai/claude/skills/`** (Claude-oriented `SKILL.md` library; Cursor rules reference the same files) and repo overrides (RSC-first, `proxy.ts`, Tailwind v4).

Thin stubs at repo root still link into `docs/`: [STACK.md](STACK.md), [DATABASE.md](DATABASE.md), [UI.md](UI.md).

## Scripts

| Command          | Description        |
| ---------------- | ------------------ |
| `npm run dev`    | Development server |
| `npm run build`  | Production build   |
| `npm run lint`   | ESLint             |
| `npm run format` | Prettier           |

## Supabase local

Use the Supabase CLI (`npx supabase …`). Local DB settings live in [supabase/config.toml](supabase/config.toml). See **[docs/ai/AGENTS.md](docs/ai/AGENTS.md)** for `db reset`, `db push`, and type generation.
