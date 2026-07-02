# Validata - Clinical Research Platform

Validata is a full-stack Electronic Data Capture (EDC) and eCRF application built by a student development team for a joint clinical research initiative between Braude College of Engineering and Rambam Hospital.

The platform tracks study participants, records measurements, and validates AI-based measurements against manual reference measurements (e.g., goniometer), for project **D-26-4-1 (Dorsiflexion Angle Measurement)** — comparing AI image-analysis angle measurements to goniometer reference values.

## Repository Structure

```
Validata/
└── validata-app/             # Main application (Next.js)
    ├── src/app/api/          # Serverless API routes (studies, participants, measurements, profiles, chat)
    ├── src/app/components/   # UI (Analysis, DataCollection, Participants, StudyManagement, UserManagement, AIChat...)
    ├── src/lib/               # Supabase client, auth, and cookie helpers
    └── supabase_setup.sql    # Database schema & Row-Level Security (RLS) policies
```

## Architecture & Security

- Secure execution architecture using Vercel edge middleware for global authentication routing and serverless Node.js API microservices.
- Zero-trust data access model built on Supabase/PostgreSQL Row-Level Security (RLS) policies, enforcing strict, role-based patient data privacy at the database layer.
- Client-side data ingestion pipeline using SheetJS (`xlsx`) for secure, local spreadsheet parsing, paired with interactive Chart.js dashboards.
- AI chat assistant (Google Gemini via the Vercel AI SDK) for natural-language queries and on-demand chart generation over loaded study data.

## Tech Stack

- Next.js (React) + Tailwind CSS
- Supabase (PostgreSQL + Auth + Row-Level Security)
- Vercel (deployment & edge middleware)
- Chart.js / react-chartjs-2, Recharts
- SheetJS (`xlsx`), jsPDF / html2pdf for spreadsheet and report export
- Google Gemini (`@ai-sdk/google`) via the Vercel AI SDK

## Getting Started

```bash
cd validata-app
npm install
npm run dev
```

Add a `.env.local` file with your Supabase and Google AI credentials (see `supabase_setup.sql` for the database schema and RLS policies):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

## Analysis Dashboard

The View & Analysis screen includes:
- Agreement scatter plot (AI vs. goniometer)
- Bland-Altman plot (bias & limits of agreement)
- Error histogram
- RMSE/MAE trend over sessions
- Accuracy threshold pass rate

## Contributors

- [ororbach](https://github.com/ororbach)
- [liraztubul](https://github.com/liraztubul)
- [adipeled1](https://github.com/adipeled1)
- [shakedm341-lang](https://github.com/shakedm341-lang)
- [ofir2207](https://github.com/ofir2207)

## Project Context

Braude College - Department of Electrical Engineering
Project Code: D-26-4-1 (Dorsiflexion Angle Measurement)
Project Advisor: Dr. Einat Ravid
