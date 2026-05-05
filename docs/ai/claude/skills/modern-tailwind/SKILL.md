---
name: modern-tailwind
description: Build clean, scalable UIs with Tailwind CSS using modern utilities and variants
triggers:
  - adding or editing Tailwind CSS classes
  - styling a component, page, or layout
  - implementing responsive design or dark mode
  - asked about hover, focus, or state-based styling
---

# Tailwind CSS Best Practices

## Core Principles

- Prefer utility classes over custom CSS for most styling
- Keep class lists readable by grouping: layout → spacing → typography → color → effects
- Use semantic HTML first; utilities should enhance, not replace structure

## Variants & State

- Use `hover`, `focus-visible`, `disabled`, `dark`, and `motion-safe` variants where appropriate
- Prefer `data-*` and `aria-*` variants for stateful styling tied to DOM semantics
- Use `group` and `peer` for parent/sibling state without extra JS

## Responsive & Container Queries

- Start with the base styles, then add responsive variants (`sm`, `md`, `lg`, ...)
- Use container query utilities when layout depends on parent size

## Theming & Customization

- Extend the theme in `tailwind.config` when using the classic config pipeline; with **Tailwind v4**, many teams define **`@theme`** and CSS variables in a global stylesheet (e.g. **`app/globals.css`**) instead of or in addition to config
- Use `@layer` for custom utilities/components when repetition is unavoidable
- Avoid `@apply` except for small, repeatable patterns

## Maintainability

- Extract reusable UI into components instead of repeating large class strings
- Keep class names deterministic; avoid dynamic string concatenation when possible
