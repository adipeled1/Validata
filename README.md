# Validata — Clinical Research EDC Platform

Validata is a full-stack Electronic Data Capture (EDC) and eCRF web application built by a student team at Braude College of Engineering for a joint clinical research initiative with Rambam Hospital.

The platform manages study participants, records and validates measurements, and compares AI-based angle measurements against manual goniometer reference values.

> **This is a student academic project.** It does not claim ICH E6(R3) or GCP compliance.
> Read [`DISCLAIMER.md`](documentation/DISCLAIMER.md) before using this software in any clinical context.

---

## Repository Structure

```
Validata/
├── README.md                  ← you are here (overview)
├── LICENSE
├── documentation/             ← project guidance and schemas
│   ├── DISCLAIMER.md          ← ICH / compliance / open-source disclaimer
│   ├── FEATURES.md            ← full feature description
│   ├── INVESTIGATOR.md        ← investigator guide
│   ├── MENTOR.md              ← mentor guide
│   ├── ROLES.md               ← user roles guide
│   └── SCHEMA.md              ← database schema diagram
├── docs/                      ← infrastructure, quality, compliance, technical docs
└── validata-app/              ← Next.js application
    ├── src/
    │   ├── app/
    │   │   ├── (dashboard)/   — dashboard pages
    │   │   ├── api/           — serverless API routes
    │   │   └── components/    — React UI components
    │   ├── lib/               — auth, repositories, schemas, mappers
    │   └── context/           — React context (session, study)
    └── supabase_setup.sql     — full database schema (run once on new project)
```

---

## Tech Stack

- **Next.js** (App Router) + React + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + Row-Level Security)
- **Vercel** (deployment + edge middleware)
- **Chart.js / Recharts** — analysis dashboards
- **SheetJS (`xlsx`)** — spreadsheet import
- **Zod** — runtime schema validation

---

## Getting Started

```bash
cd validata-app
npm install
npm run dev
```

Create `validata-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Demo mode is opt-in and off by default - omit these two entirely in any real deployment.
NEXT_PUBLIC_DEMO_ENABLED=true
DEMO_SESSION_SECRET=a-long-random-dev-only-secret
```

For the full Supabase project setup, follow [`docs/infrastructure/supabase_bootstrap.md`](docs/infrastructure/supabase_bootstrap.md).

For a full description of every feature, see [`FEATURES.md`](documentation/FEATURES.md).

For system explainers (how each part works), see [`docs/`](docs/README.md).

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
| Partner | Rambam Health Care Campus |
| Advisors | Dr. Naomi Unkelos Shpigel, Dr. Einat Ravid |

---

## License

[Apache 2.0](LICENSE)
