# UI Description & Components

**Tokens:** design CSS variables and `@theme` live in [app/globals.css](../app/globals.css). Product name and tagline: [lib/brand.ts](../lib/brand.ts).

## Design System

### Colors

Authoritative HSL channel tokens are defined in `:root` / `.dark` in [app/globals.css](../app/globals.css) and exposed as Tailwind utilities through `@theme inline`. Use the named utilities (`bg-primary`, `text-foreground`, `bg-cta`, etc.) — do not hard-code raw hex.

| Token                                                             | Purpose                                       | Utility examples                                    |
| ----------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `background`                                                      | App canvas behind the shell                   | `bg-background`                                     |
| `foreground`                                                      | Default body text                             | `text-foreground`                                   |
| `card` / `card-foreground`                                        | Card surface and its text                     | `bg-card`, `text-card-foreground`                   |
| `popover`                                                         | Popover/menu surface                          | `bg-popover`                                        |
| `primary` / `primary-foreground` / `primary-soft` / `primary-ink` | Brand primary + tinted surface / on-soft text | `bg-primary`, `bg-primary-soft`, `text-primary-ink` |
| `secondary`                                                       | Secondary actions / neutral chips             | `bg-secondary`                                      |
| `muted` / `muted-foreground`                                      | Subdued surfaces and meta text                | `bg-muted`, `text-muted-foreground`                 |
| `accent` / `accent-soft`                                          | Accent emphasis (success-ish teal)            | `text-accent`, `bg-accent-soft`                     |
| `cta` / `cta-foreground`                                          | Primary call-to-action buttons                | `bg-cta`, `text-cta-foreground`                     |
| `success` / `warning` / `destructive`                             | Status semantics                              | `text-success`, `bg-destructive/10`                 |
| `border` / `input` / `ring`                                       | Borders, form-control borders, focus ring     | `border-border`, `ring-ring`                        |
| `sidebar*`                                                        | Sidebar surface + nav active state            | `bg-sidebar`, `text-sidebar-foreground`             |
| `app-shell-canvas`                                                | App-shell viewport background                 | `bg-app-shell-canvas`                               |
| `chart-1` … `chart-5`                                             | Chart series                                  | `text-chart-1`                                      |

Marketing-only deep teal: `--accent-teal-strong` via `bg-(--accent-teal-strong)` / `text-(--accent-teal-strong)`.

### Typography

- **Body / UI**: `--font-sans` → Inter (`var(--font-inter)` set in `app/layout.tsx`), system fallbacks
- **Headings**: `--font-heading` → Fraunces (serif display) — used for page titles and hero copy
- **Mono / tabular**: `--font-mono` → Roboto Mono — used for IDs, dates, numeric columns

App UI defaults to `text-sm` (14px) with `leading-relaxed` for prose; KPI values use `text-2xl md:text-3xl`. Marketing copy uses `text-base` (16px) as the base size.

### Spacing (padding / gap)

Tailwind tokens from `@theme` in [globals.css](../app/globals.css) — every value is a multiple of 8px:

| Token       | Value | Typical use                                                   |
| ----------- | ----- | ------------------------------------------------------------- |
| `inset`     | 8px   | Tight gaps (icon + label), small stacks, list rhythm          |
| `block`     | 16px  | Page gutters, default card/header padding, form field spacing |
| `section`   | 24px  | Denser sections, grids, roomy cards                           |
| `layout`    | 32px  | Major section vertical padding, wide empty states             |
| `hero`      | 64px  | Landing hero vertical padding (mobile)                        |
| `hero-wide` | 80px  | Landing hero vertical padding (`sm+`)                         |

Utilities: `p-inset`, `px-block`, `py-layout`, `gap-section`, `space-y-inset`, etc. **All paddings and gaps in app UI must use these tokens** — no raw `p-2.5`, `gap-3`, `space-y-5`, etc. Icon sizes (`size-3.5`, `size-4.5`) are exempt: those are glyph sizes, not layout spacing.

---

## Component Library

### Layout Components

- **`AppShell`** — [components/app-shell/app-shell.tsx](../components/app-shell/app-shell.tsx). Renders the authenticated layout: sidebar on the left (`hidden md:flex`), header on top, scrolling `<main>` with `px-block py-section md:px-layout md:py-layout`.
- **`AppHeader`** — [components/app-shell/app-header.tsx](../components/app-shell/app-header.tsx). Sticky bar (56px on `md+`). On mobile (`<md`) it shows a hamburger that opens the sidebar nav in a `Sheet`; on `md+` it shows the sidebar-collapse toggle. Right side: cart (clients), notifications, user menu — all `size-10` (40px) hit targets.
- **`AppSidebar`** — [components/app-shell/app-sidebar.tsx](../components/app-shell/app-sidebar.tsx). Fixed vertical nav, collapsible to icon strip; hidden under `md`. Mobile users access the same nav via the header `Sheet`.
- **`AppBreadcrumbs`** — [components/app-shell/app-breadcrumbs.tsx](../components/app-shell/app-breadcrumbs.tsx). Rendered at the top of `<main>`.
- **`PageHeader`** — [components/ui/page-header.tsx](../components/ui/page-header.tsx). Required wrapper for every authenticated page title. Stacks title + action vertically on mobile, side-by-side on `md+`. Props: `title`, `description`, `meta` (badges/chips slot under title), `action` (primary action; full-width on mobile).
- **Page container max-widths** (apply on the page's outer wrapper):

  | Page type                         | Max-width   | Examples                                                        |
  | --------------------------------- | ----------- | --------------------------------------------------------------- |
  | List / data-table pages           | `max-w-6xl` | OrdersList, InvoicesList, EarningsView                          |
  | Detail / form pages               | `max-w-4xl` | OrderDetailView, InvoiceDetailView, SiteListingForm             |
  | Narrow form / checkout            | `max-w-2xl` | ProfileView, CheckoutView                                       |
  | Card-shell full-column components | none        | SitesCatalog, OrdersList, UsersManagement, CategoriesManagement |

### Form Components

- **`Button`** — [components/ui/button.tsx](../components/ui/button.tsx). **All sizes are 40px (`h-10` / `size-10`)** — only the inner padding, text size, icon size, and corner radius vary across the `xs / sm / default / lg / xl` and `icon-*` variants. Variants: `default`, `cta`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
- **`FormControlInput`** — pill-style `h-10 rounded-full` input. Shared with `FilterInput`.
- **`FilterBar` / `FilterSelect` / `FilterInput`** — [components/ui/filter-bar.tsx](../components/ui/filter-bar.tsx). `FilterBar` wraps a row of filters: `flex flex-col` on mobile, `flex-row flex-wrap` on `sm+`. `FilterSelect` is a native `<select>` styled like `FormControlInput` (immediate `onChange` navigation, no submit).
- **`Textarea`** — [components/ui/textarea.tsx](../components/ui/textarea.tsx).
- **`Select`** (Base-UI) — [components/ui/select.tsx](../components/ui/select.tsx). For app forms; use `FilterSelect` for URL-driven filter bars instead.
- **`Checkbox`** — [components/ui/checkbox.tsx](../components/ui/checkbox.tsx).
- **`Dialog` / `Sheet`** — [components/ui/dialog.tsx](../components/ui/dialog.tsx), [components/ui/sheet.tsx](../components/ui/sheet.tsx).

### Data Display

- **`Table`** — [components/ui/table.tsx](../components/ui/table.tsx). Wraps the `<table>` in a `relative w-full overflow-x-auto` container, so on small screens the table scrolls horizontally inside its card. Cell/head padding uses `p-inset` (8px); row height `h-10`.
- **`Card`** — [components/ui/card.tsx](../components/ui/card.tsx). `CardHeader` defaults to `px-block py-block` (or `px-section py-section` on roomy cards).
- **`Badge`** / status pills — short rounded-full chips at `px-inset py-0.5 text-xs`; family-specific colors come from `*_STATUS_CHIP` maps in `lib/`.

### Feedback

- **Toast** — `sonner` via `Toaster` mounted in `app/layout.tsx`.
- **Loading** — skeleton patterns (`bg-muted/40 animate-pulse rounded-md`) and Suspense fallbacks.
- **Error** — page-level boundaries plus the `/api/client-error` beacon for client-side reporting.

---

## Responsive Design

Mobile-first; Tailwind defaults are the only breakpoints used.

| Name   | Min width | Notes                                                                                                                                         |
| ------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| (base) | < 640px   | **Mobile.** Single-column. Sidebar hidden; nav lives in the header `Sheet`. Filters stack.                                                    |
| `sm`   | 640px+    | **Large mobile / small tablet.** Filter bars wrap to a row; KPI grids go to 2 columns.                                                        |
| `md`   | 768px+    | **Tablet / desktop.** Sidebar appears (`hidden md:flex`). Main gutter widens to `layout`. PageHeader switches to side-by-side title + action. |
| `lg`   | 1024px+   | Two-column detail layouts (`grid-cols-1 lg:grid-cols-[1fr_320px]`); three-column dashboard rows.                                              |
| `xl`   | 1280px+   | KPI grids expand to 4 columns where applicable.                                                                                               |

Guidelines:

- Default class targets ≤640px. Add `sm:` / `md:` / `lg:` / `xl:` to scale up.
- Replace fixed `grid-cols-N` (N ≥ 2) with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`.
- Replace horizontal `flex` rows of cards with `flex flex-col gap-section md:flex-row`.
- Tables stay as tables and scroll horizontally inside their card on narrow screens — do not collapse to cards unless the design calls for it.
- All hit targets (buttons, icon affordances) are 40px to match the unified `Button` height.

---

### Update this file when:

- Adding new components
- Changing design system tokens (colors, spacing, typography)
- Creating new pages or changing page-container conventions
- Modifying component behavior or breakpoint rules
