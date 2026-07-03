# Validata EDC — `validata-app`

This is the Next.js application for the Validata EDC platform.

For all documentation, see the repository root:

- [`../README.md`](../README.md) — project overview, contributors, tech stack, getting started
- [`../FEATURES.md`](../FEATURES.md) — full feature and technical description, all ICH-inspired additions
- [`../DISCLAIMER.md`](../DISCLAIMER.md) — ICH / compliance / open-source disclaimer

For Supabase setup, follow [`docs/supabase_bootstrap.md`](docs/supabase_bootstrap.md).

```bash
npm install
npm run dev
```

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key
NEXT_PUBLIC_DEMO_ENABLED=true
```
