# Validata EDC — `validata-app`

This is the Next.js application for the Validata EDC platform.

For all documentation, see the repository root:

- [`../README.md`](../README.md) — project overview, contributors, tech stack, getting started
- [`../documentation/FEATURES.md`](../documentation/FEATURES.md) — full feature and technical description, all ICH-inspired additions
- [`../documentation/DISCLAIMER.md`](../documentation/DISCLAIMER.md) — ICH / compliance / open-source disclaimer

For Supabase setup (schema, RLS policies, triggers), run [`supabase_setup.sql`](supabase_setup.sql) against a new Supabase project.

```bash
npm install
npm run dev
```

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Demo mode is opt-IN and fails closed: omit these two entirely in any real
# deployment. Setting NEXT_PUBLIC_DEMO_ENABLED=true without DEMO_SESSION_SECRET
# still leaves demo mode unusable (POST /api/auth/demo-login refuses to issue
# a session without a secret to sign it with) - see src/lib/demoSession.ts.
NEXT_PUBLIC_DEMO_ENABLED=true
DEMO_SESSION_SECRET=a-long-random-dev-only-secret
```
