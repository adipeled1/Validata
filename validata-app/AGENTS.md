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
  URL/anon key, Google AI key). Never commit secrets.
- Database schema and RLS policies live in `supabase_setup.sql` — keep it in sync with any
  schema change.
