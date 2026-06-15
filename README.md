# Validata - Clinical Research Platform

A web application for managing clinical research projects - tracking participants, recording measurements, and validating AI-based measurements against manual reference measurements (e.g., goniometer).

Built for project **D-26-4-1 (Dorsiflexion Angle Measurement)**, comparing AI image-analysis angle measurements to goniometer reference values.

## Repository Structure

```
Validata/
├── validata-app/             # Main application (Next.js)
├── react-prototype/          # Early React prototype
├── Tutorial1/prototype/      # Initial learning prototype
├── B16_GROUP_part1_ER.docx   # Entity-Relationship diagram & requirements (Part 1)
└── diagram.md                # Architecture diagram
```

## Tech Stack

- Next.js (React)
- PostgreSQL
- OpenAI API
- Recharts + Tailwind CSS

## Getting Started

```bash
cd validata-app
npm install
npm run dev
```

Add a `.env.local` file with:
```
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
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
