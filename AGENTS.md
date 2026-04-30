<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agent Rules & Guidelines

## Before Creating Any Feature

1. **Read documentation first** — Consult:
   - `STACK.md` — Current tech stack and versions
   - `DATABASE.md` — Database structure and schemas
   - `UI.md` — UI components and design system
   - `CLAUDE.md` — Project-specific guidelines

2. **Environment & Security**
   - ⚠️ **NEVER** read or reference `.env` files in code, suggestions, or documentation
   - ⚠️ **NEVER** ask users for credentials or API keys
   - Use environment variables at runtime only
   - Keep secrets in `.env` (gitignored)

3. **Development Workflow**
   - Run tests before committing
   - Follow existing code patterns
   - Check for breaking changes in dependencies
   - Update relevant documentation after changes

4. **Documentation Updates**
   - Update `STACK.md` if adding/upgrading dependencies
   - Update `DATABASE.md` if modifying schema
   - Update `UI.md` if adding new components
