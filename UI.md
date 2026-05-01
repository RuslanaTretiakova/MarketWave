# UI Description & Components

**Tokens:** design CSS variables and `@theme` live in [app/globals.css](app/globals.css). Product name and tagline: [lib/brand.ts](lib/brand.ts).

## Design System

### Colors

- [Primary color TBD]
- [Secondary color TBD]
- [Accent color TBD]
- [Neutral shades TBD]

### Typography

- **Font Family**: [TBD]
- **Base Font Size**: [TBD]
- **Line Height**: [TBD]

### Spacing (padding / gap)

Tailwind tokens from `@theme` in [globals.css](app/globals.css):

| Token       | Value | Typical use                                                   |
| ----------- | ----- | ------------------------------------------------------------- |
| `inset`     | 8px   | Tight gaps (icon + label), small stacks, list rhythm          |
| `block`     | 16px  | Page gutters, default card/header padding, form field spacing |
| `section`   | 24px  | Denser sections, grids, roomy cards                           |
| `layout`    | 32px  | Major section vertical padding, wide empty states             |
| `hero`      | 64px  | Landing hero vertical padding (mobile)                        |
| `hero-wide` | 80px  | Landing hero vertical padding (`sm+`)                         |

Utilities: `p-inset`, `px-block`, `py-layout`, `gap-section`, `space-y-inset`, etc. Prefer these over raw `p-4` / `gap-3` in app UI so spacing stays on-scale.

---

## Component Library

### Layout Components

- `Header` - [Description TBD]
- `Footer` - [Description TBD]
- `Sidebar` - [Description TBD]
- `Container` - [Description TBD]

### Form Components

- `Input` - [Description TBD]
- `Button` - [Description TBD]
- `Select` - [Description TBD]
- `Checkbox` - [Description TBD]
- `Radio` - [Description TBD]
- `Textarea` - [Description TBD]

### Data Display

- `Table` - [Description TBD]
- `Card` - [Description TBD]
- `List` - [Description TBD]
- `Badge` - [Description TBD]

### Feedback

- `Modal` - [Description TBD]
- `Toast/Notification` - [Description TBD]
- `Loading` - [Description TBD]
- `Error` - [Description TBD]

---

## Pages

### [Page Name TBD]

- **Route**: `/[path]`
- **Purpose**: [Description]
- **Components Used**: [List]
- **Data Sources**: [API endpoints or data fetching]

---

## Responsive Design

- **Mobile Breakpoint**: [TBD]
- **Tablet Breakpoint**: [TBD]
- **Desktop Breakpoint**: [TBD]

---

### Update this file when:

- Adding new components
- Changing design system
- Creating new pages
- Modifying component behavior
