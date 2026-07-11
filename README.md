# Validata — Clinical Research EDC Platform

Validata is a full-stack Electronic Data Capture (EDC) and eCRF web application built by a student team at Braude College of Engineering for a joint clinical research initiative with the partner medical center.

The platform manages study participants, records and validates measurements, and compares AI-based angle measurements against manual goniometer reference values.



> **This is a student academic project.** It does not claim ICH E6(R3) or GCP compliance.
> Read [`DISCLAIMER.md`](documentation/DISCLAIMER.md) before using this software in any clinical context.

---

## Repository Structure

```
Validata/
├── README.md                     ← you are here (overview)
├── LICENSE
├── documentation/                ← project guidance and schemas
│   ├── DISCLAIMER.md             ← student project disclaimer
│   ├── FEATURES.md               ← full feature description
│   ├── INVESTIGATOR.md           ← investigator guide
│   ├── MENTOR.md                 ← mentor guide
│   ├── ROLES_AND_REGISTRATION.md ← user roles and registration flow guide
│   ├── SUPABASE_BOOTSTRAP.md     ← database setup and bootstrap guide
│   └── SCHEMA.md                 ← database schema diagram
└── validata-app/                 ← Next.js application
    ├── src/
    │   ├── app/
    │   │   ├── (dashboard)/      — dashboard pages
    │   │   ├── api/              — serverless API routes
    │   │   └── components/       — React UI components
    │   ├── lib/                  — auth, repositories, schemas, mappers
    │   └── context/              — React context (session, study)
    └── supabase_setup.sql        — full database schema (run once on new project)
```

---

## Tech Stack

- **Next.js** (App Router) + React + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + Row-Level Security)
- **Vercel** (deployment + edge middleware)
- **Recharts** — analysis dashboards
- **SheetJS (`xlsx`)** — spreadsheet import
- **Zod** — runtime schema validation

---

## Getting Started

1. **Install dependencies**:
   ```bash
   cd validata-app
   npm install
   ```

2. **Configure environment variables**:
   Create `validata-app/.env.local` (you can copy `.env.example` as a template):
   ```bash
   cp .env.example .env.local
   ```
   Configure your Supabase credentials and demo settings:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   # Demo mode is opt-in and off by default - omit these two entirely in any real deployment.
   NEXT_PUBLIC_DEMO_ENABLED=true
   DEMO_SESSION_SECRET=a-long-random-dev-only-secret
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

For the full Supabase project setup (schema, RLS policies, triggers), run [`validata-app/supabase_setup.sql`](validata-app/supabase_setup.sql) against a new Supabase project. For a step-by-step walkthrough on project configuration, enabling email verification, and activating the initial admin account, follow the [`SUPABASE_BOOTSTRAP.md`](documentation/SUPABASE_BOOTSTRAP.md) guide.

For a full description of every feature, see [`FEATURES.md`](documentation/FEATURES.md).

---

## Contributors

- [ororbach](https://github.com/ororbach)
- [liraztubul](https://github.com/liraztubul)
- [adipeled1](https://github.com/adipeled1)
- [shakedm341-lang](https://github.com/shakedm341-lang)
- [ofir2207](https://github.com/ofir2207)

---

## Project Context

| | |
|---|---|
| Institution | Braude College of Engineering, Karmiel, Israel |
| Departments | Software Engineering; Electrical and Electronics Engineering |
| Partner | Partner Medical Center |
| Advisors | Dr. Naomi Unkelos Shpigel, Dr. Einat Ravid |

---

## License

[Apache 2.0](LICENSE)
