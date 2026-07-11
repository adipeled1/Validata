# Validata — Agent Instructions

Validata is a Next.js (App Router) clinical research EDC platform for project D-26-4-1
(Dorsiflexion Angle Measurement), built for Braude College / Rambam Hospital. See
`README.md` for full project context.

## Stack
- Next.js (App Router) + React, Tailwind CSS
- Supabase (Postgres + Auth + Row-Level Security)
- Deployed on Vercel

## Commands
- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — lint

## Conventions
- Environment variables go in `.env.local` (see `README.md` for required keys — Supabase
  URL/anon key). Never commit secrets.
- Database schema and RLS policies live in `supabase_setup.sql` — keep it in sync with any
  schema change.

## Architecture notes

**Two demo-mode stores, not a duplication bug.** `src/lib/demoStore.ts` (server-side,
one shared object per running process) and `src/lib/clientDemoStore.ts` (client-side,
`sessionStorage`-backed, per browser tab) both exist on purpose:
- `demoStore.ts` backs the server-rendered initial load (e.g. `(dashboard)/layout.tsx`)
  and is fine for a single long-lived process, but a public multi-visitor hosted demo
  on Vercel breaks it two ways — visitors would share one global store (no isolation),
  and serverless invocations are stateless/ephemeral (module-level state doesn't
  reliably persist across them).
- `clientDemoStore.ts` is the one that actually matters for the hosted demo — it's
  scoped to one browser tab and resets when the tab closes, which is exactly the
  "closes it and comes back, brand new" behavior a public demo needs.

Their shapes are kept intentionally close so call sites read the same either way and
one can be sanity-checked against the other. When adding a new demo-mode entity,
mirror it in both.
