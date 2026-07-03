# Validata — Clinical Research EDC Platform

Validata is a full-stack Electronic Data Capture (EDC) and eCRF web application built by a student team at Braude College of Engineering for a joint clinical research initiative with Rambam Hospital.

The platform manages study participants, records and validates measurements, and compares AI-based angle measurements against manual goniometer reference values.

> **This is a student academic project.** It does not claim ICH E6(R3) or GCP compliance.
> Read [`DISCLAIMER.md`](DISCLAIMER.md) before using this software in any clinical context.

---

## Repository Structure

```
Validata/
├── README.md                  ← you are here (overview)
├── FEATURES.md                ← full feature and technical description
├── DISCLAIMER.md              ← ICH / compliance / open-source disclaimer
├── road_to_compliance_plan.md ← ICH E6(R3) gap analysis document
├── compliance_todo.md         ← implementation tracking checklist
├── ich_compliance_report.md   ← per-task implementation report
└── validata-app/              ← Next.js application
    ├── src/
    │   ├── app/
    │   │   ├── (dashboard)/   — dashboard pages
    │   │   ├── api/           — serverless API routes
    │   │   └── components/    — React UI components
    │   ├── lib/               — auth, repositories, schemas, mappers
    │   └── context/           — React context (session, study)
    ├── supabase_setup.sql     — full database schema (run once on new project)
    └── docs/
        ├── supabase_bootstrap.md       — step-by-step new project setup
        ├── validation_master_plan.md   — VMP skeleton (student reference)
        ├── disaster_recovery_runbook.md
        └── csv_periodic_review.md
```

---

## Tech Stack

- **Next.js** (App Router) + React + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + Row-Level Security)
- **Vercel** (deployment + edge middleware)
- **Chart.js / Recharts** — analysis dashboards
- **SheetJS (`xlsx`)** — spreadsheet import
- **Google Gemini** (`@ai-sdk/google`) — AI analysis assistant
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
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key
NEXT_PUBLIC_DEMO_ENABLED=true
```

For the full Supabase project setup, follow [`validata-app/docs/supabase_bootstrap.md`](validata-app/docs/supabase_bootstrap.md).

For a full description of every feature, see [`FEATURES.md`](FEATURES.md).

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
