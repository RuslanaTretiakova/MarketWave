# Technology Stack & Versions

Values below mirror [package.json](../package.json). Bump this file when dependencies change.

## Core Framework

- **Next.js**: 16.2.4 (App Router) — see `node_modules/next/dist/docs/` for breaking changes
- **React**: 19.2.4 · **react-dom**: 19.2.4
- **TypeScript**: ^5
- **Node.js**: use an LTS release compatible with Next 16 (see official Next.js docs for supported versions)

## Frontend

- **Styling**: Tailwind CSS ^4 (`@tailwindcss/postcss`), [app/globals.css](../app/globals.css)
- **UI Components**: shadcn ^4.6.0 (base-nova, [components.json](../components.json)), `@base-ui/react`, `lucide-react`
- **State Management**: React built-in (no global store required for current app)
- **HTTP Client**: `@supabase/supabase-js` + `@supabase/ssr`

## Backend

- **API**: Next.js App Router (Server Components, Server Actions, route handlers as needed)
- **Database**: Supabase PostgreSQL (local major version 17 per [supabase/config.toml](../supabase/config.toml))
- **Authentication**: Supabase Auth
- **Data access**: Supabase client + RLS; no ORM

## Infrastructure

- **Hosting**: [TBD]
- **Database / Auth**: Supabase — URLs and keys only in `.env` (never commit)
- **File Storage**: [TBD]
- **Analytics**: [TBD]

## Development Tools

- **Package Manager**: **npm** (see [package-lock.json](../package-lock.json))
- **Linting**: ESLint ^9 · `eslint-config-next` 16.2.4
- **Formatting**: Prettier ^3.8.3 · `prettier-plugin-tailwindcss`
- **Testing**: [TBD]
- **Build Tool**: Next.js built-in (`npm run build`)
- **Git hooks**: Husky + lint-staged

## Third-party Services

- **Supabase**: configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` per [.env.example](../.env.example). Do not hardcode project IDs or URLs in committed docs.

## Environment Variables

All sensitive configuration is in `.env` (gitignored). See [.env.example](../.env.example) for the template.

---

### Update this file when:

- Adding/removing dependencies
- Upgrading framework versions
- Changing service providers
