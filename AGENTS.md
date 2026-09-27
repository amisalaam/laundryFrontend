<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend Rules

This is the Next.js App Router frontend for the laundry management system.

## Framework

- This project uses Next.js App Router and TypeScript.
- Keep TypeScript; do not convert to JavaScript.
- Use Server Components by default.
- Add `"use client"` only for state, effects, browser APIs, event handlers, or client-only libraries.
- Keep client boundaries small.

## Structure

Use the current `app/` directory for routing unless a migration to `src/app` is explicitly approved.

Recommended future folders:

- `components/ui`
- `components/forms`
- `components/layout`
- `components/feedback`
- `features/auth`
- `features/businesses`
- `features/branches`
- `features/staff`
- `services`
- `hooks`
- `lib`
- `types`
- `utils`

## Components

- Build small reusable components.
- Page files should compose feature and UI components.
- Generic UI components belong in `components/ui`.
- Feature-specific components belong in their feature folder.
- Do not put business logic inside generic UI components.
- Support loading, disabled, error, and empty states.
- Use semantic HTML.
- Use accessible labels.
- Ensure keyboard accessibility.
- Use visible focus states.
- Do not use clickable divs when a button or link is appropriate.
- Destructive actions require confirmation.

## API Layer

- All backend calls must go through `services/`.
- Configure the API base URL centrally.
- Do not hard-code backend URLs inside components.
- Normalize API errors.
- Handle unauthorized and forbidden responses consistently.
- Do not expose private environment variables to the browser.
- Only use `NEXT_PUBLIC_` for safe public values.

## Styling

- Use Tailwind CSS consistently.
- Avoid arbitrary colors scattered throughout features.
- Establish reusable design tokens.
- Build mobile-first responsive layouts.
- Avoid inline styles unless values are genuinely dynamic.
- Respect reduced-motion preferences.

## State

Use the smallest appropriate state mechanism:

- Local state for local UI.
- URL search params for filters, sorting, and pagination.
- Server-rendered data for initial page data.
- Global state only for genuinely shared client state.
- Do not store every API response globally.
