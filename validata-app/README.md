# Validata EDC — `validata-app`

This is the Next.js application for the Validata EDC platform.

For all documentation, see the repository root:

- [`../README.md`](../README.md) — project overview, contributors, tech stack, getting started
- [`../docs/getting-started/FEATURES.md`](../docs/getting-started/FEATURES.md) — full feature and technical description, all ICH-inspired additions
- [`../DISCLAIMER.md`](../DISCLAIMER.md) — ICH / compliance / open-source disclaimer

For Supabase setup, follow [`../docs/infrastructure/supabase_bootstrap.md`](../docs/infrastructure/supabase_bootstrap.md).

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
