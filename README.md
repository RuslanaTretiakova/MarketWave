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

- **[AGENTS.md](AGENTS.md)** — stack versions, Supabase clients, type generation, migrations, RLS expectations (read this before changing code).
- **[STACK.md](STACK.md)** — dependency-oriented stack summary.
- **[DATABASE.md](DATABASE.md)** — schema pointers; migrations are authoritative.

## Scripts

| Command          | Description        |
| ---------------- | ------------------ |
| `npm run dev`    | Development server |
| `npm run build`  | Production build   |
| `npm run lint`   | ESLint             |
| `npm run format` | Prettier           |

## Supabase local

Use the Supabase CLI (`npx supabase …`). Local DB settings live in [supabase/config.toml](supabase/config.toml). See **AGENTS.md** for `db reset`, `db push`, and type generation.
