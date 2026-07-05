# Validata — Full Feature Description

This document describes every feature in the Validata EDC platform in detail, including the ICH E6(R3)-inspired additions.

For a short overview see [`README.md`](README.md).
For the full disclaimer see [`DISCLAIMER.md`](DISCLAIMER.md).

---

## What Validata Does

Validata is a full-stack Electronic Data Capture (EDC) and eCRF web application purpose-built for clinical research data management. It was originally developed for project D-26-4-1 (Dorsiflexion Angle Measurement) at Braude College in collaboration with Rambam Hospital.

The system:
- Manages studies, participants, and clinical measurement data
- Compares AI-generated angle measurements (computer vision) against manual goniometer reference values
- Provides statistical analysis and visualisations for method-comparison studies
- Implements structural controls inspired by ICH E6(R3) Good Clinical Practice

---

## Application Architecture

```
Browser (React / Next.js App Router)
    ↓
Next.js Edge Middleware (proxy.ts)
    — session cookie verification, demo-mode gate
    ↓
Next.js Server Components + Server Actions
    — dashboard pages, data fetching
    ↓
Next.js API Routes (serverless)
    — REST endpoints for all write operations
    ↓
Supabase (PostgreSQL + Auth)
    — RLS policies, SECURITY DEFINER triggers, audit log
```

All database writes happen through server-side code only. The Supabase anon key reaches the browser but no client-side code writes directly to the database — every mutation goes through an API route or Server Action that validates the session first.

---

## Authentication and Session Management

- Email + password authentication via Supabase Auth
- Sessions managed with signed cookies (HttpOnly, `SameSite=Strict`, conditional `Secure` flag)
- Middleware (`proxy.ts`) validates the session cookie on every request and redirects to `/login` if invalid
- **Demo mode** — dev-only bypass via `NEXT_PUBLIC_DEMO_ENABLED=true`; disabled with `NEXT_PUBLIC_DEMO_ENABLED=false` in production
- New users are auto-created with role `team_member` and status `pending` via a database trigger; a mentor must approve before they can access the dashboard

---

## Role-Based Access Control (9 Roles)

The platform implements a 9-role model at both the SQL and TypeScript layers.

| Role | Description |
|---|---|
| `mentor` | System administrator, equivalent to sponsor/PI; full access |
| `sponsor_admin` | Sponsor-level administrator |
| `investigator` | Principal investigator at a site |
| `site_coordinator` | Site research coordinator |
| `data_manager` | Data entry and query resolution |
| `monitor` | CRA / clinical monitor, read-only clinical data |
| `auditor` | Read-only access to audit trail and signatures |
| `irb_reviewer` | Access to consent records and study protocols |
| `team_member` | Default role for new users; pending approval |

**SQL helpers:** `can_edit_data()` and `can_read_only()` SECURITY DEFINER functions are used in all Row-Level Security policies. TypeScript mirrors (`canEditData()`, `canReadOnly()`) in `src/lib/auth-server.ts` provide the same check for API route guards.

---

## Study Management

- Create, view, and switch between multiple studies
- `activation_status` field: `draft`, `active`, `archived`, `closed`
- **Study lock** — mentors can lock a study for analysis; locked studies reject all INSERT/UPDATE on measurements and participants at the RLS level. Lock state (`lock_state`, `locked_at`, `locked_by`, `lock_reason`) is stored on the study row
- **Soft delete** — studies are never hard-deleted; `deleted_at`, `deleted_by`, `retention_hold` columns preserve the record. RLS filters soft-deleted studies from all normal queries

---

## Participant Management

- Add, view, and update participants per study
- Each participant has an ID, age, sex, condition, arm, notes, timestamps
- `created_by` UUID stored server-side so the creating user is always attributed
- `capture_method` field: `manual`, `import`, or `api`
- Consent is tracked in a separate dedicated table (see **Consent Records** below); the participant table no longer has a boolean consent flag

---

## Measurement Data Collection

- Manual entry of measurement values per participant per session
- Batch import from XLSX/CSV files via SheetJS
- Fields: `reference_value`, `ai_value`, `measurement_date`, `session_number`, `notes`
- `capture_method` and `validity_reason` fields for data quality annotation
- Locked studies block measurement inserts/updates at the database level

---

## Analysis Dashboard

The analysis page provides statistical method-comparison visualisations for AI vs. goniometer measurements:

| Chart | What it shows |
|---|---|
| Agreement scatter | AI value vs. reference; identity line; ±threshold bands |
| Bland-Altman plot | Difference vs. mean; bias line; 95% LoA |
| Error histogram | Distribution of absolute errors |
| Performance trend | RMSE and MAE per session (temporal tracking) |
| Threshold pass rate | % of measurements within acceptance threshold |
| Participant status donut | Recruitment breakdown (completed / in-progress / not-started) |
| Measurement progress bar | n completed vs. target |

Computed statistics: RMSE, MAE, bias, SD of difference, 95% limits of agreement, Pearson r, n, within-threshold%.

**Data endorsement** — investigators and mentors can electronically endorse the analysis dataset. The "Endorse Data" button opens a modal that requires re-entry of the user's password before writing a signed record (see **Electronic Signatures** below).

---

## Audit Trail

- Every INSERT, UPDATE, and DELETE on `participants`, `measurements`, `studies`, `profiles`, `queries`, `signatures`, and additional tables generates a row in `audit_log`
- Written by a `SECURITY DEFINER` Postgres trigger function (`log_audit_event()`) so `auth.uid()` is always the real authenticated user — application code cannot forge the actor
- Stored fields: `table_name`, `operation`, `record_id`, `actor` (UUID), `actor_email`, `old_data` (JSONB), `new_data` (JSONB), `changed_at` (UTC)
- **Audit Log page** (`/audit-log`) — filterable by study, actor email, action type, and date range; CSV export
- RLS on `audit_log` restricts SELECT to `monitor`, `auditor`, `mentor`, and `sponsor_admin` roles

---

## Electronic Signatures

- Implemented via `signatures` table
- Flow: user clicks "Endorse Data" → `EndorseDataModal` re-authenticates with Supabase (`/api/auth/verify-credentials`) → on success writes a signature record (`/api/signatures`)
- Signature record includes: `study_id`, `signed_by` (UUID), `signed_at` (UTC), `meaning` (the legal-meaning text shown to the user), `context` (e.g. `analysis_endorsement`)
- Only roles `mentor`, `sponsor_admin`, and `investigator` may sign
- `ConfirmWithReasonModal` is used for other destructive/reason-required actions (role changes, unlock, etc.)

---

## Query Management

Full data-query lifecycle, used when monitors or data managers raise questions about specific data points.

States: `open` → `answered` → `resolved` → `closed`

- **`/api/queries`** — GET (list) + POST (create)
- **`/api/queries/[id]`** — PATCH (advance lifecycle, set `answered_by` / `resolved_by` / `closed_by` with timestamps)
- **`/queries` dashboard page** — list all queries with inline action buttons for state transitions

---

## Consent Record Management

Versioned consent forms decoupled from participant records.

- **`consent_form_versions`** — each version has an IRB approval date, version number, and content
- **`consent_records`** — links a participant to a form version; records consent date, method (`written` / `verbal` / `electronic`), witness name, and whether the participant withdrew
- **`/api/consent`** — POST supports `action: create_version` and `action: record_consent`

The participant table's old boolean `consent` column has been replaced. The participant list shows "See consent records" in place of the former checkbox.

---

## Adverse Event / SAE Reporting

- **`adverse_events`** table: `participant_id`, `study_id`, `description`, `severity` (`mild` / `moderate` / `severe` / `life_threatening` / `fatal`), `expectedness` (`expected` / `unexpected`), `onset_date`, `authority_deadline`, `reported_at`, `reported_to`, `outcome`, `status`
- **Automatic deadline calculation** (server-side, `calculateDeadline()` in `/api/adverse-events`):
  - Fatal or life-threatening + unexpected → **7-day** reporting deadline (per ICH E2A)
  - All other unexpected → **15-day** deadline
  - Expected events → no automatic deadline
- **`/api/adverse-events`** — GET + POST
- **`/api/adverse-events/[id]`** — PATCH (update status, add outcome)

---

## User Management

- Mentor and sponsor_admin roles can view all registered users
- Approve or change role with a mandatory reason field (`change_reason` logged on the profile row)
- `ConfirmWithReasonModal` enforced for all role changes
- Users in `pending` status cannot log in to the dashboard

---

## Data Export and Archival

- **`/api/admin/export`** — exports all clinical tables as a single JSON object, computes a SHA-256 hash of the JSON payload using Node's built-in `crypto.createHash`, returns both in the response. Supports integrity verification.
- **`/api/admin/destruction-request`** — checks: study must be soft-deleted, no `retention_hold`, and at least 15 years old; records destruction requests with reason

---

## Delegation of Duties

- **`delegations`** table tracks formal delegation from one user to another for a specific task scope and study
- **`/api/admin/delegations`** — GET + POST

---

## Blinding / Treatment Assignment Vault

- **`treatment_assignments`** table — participant → treatment arm mapping, accessible only by `mentor` role via RLS
- **`unblinding_events`** — records any access to unblinding information with reason, actor, and timestamp
- **`organisations`** table — foundation for multi-sponsor / multi-site configuration

---

## IP Accountability

- **`ip_inventory`** — investigational product lot records (lot number, expiry, quantity, storage conditions)
- **`ip_dispensations`** — records each dispensing event linked to a participant and inventory lot

---

## System Inventory Register

- **`/system-inventory` dashboard page** — visible to `mentor` and `sponsor_admin` only
- Lists all software components (Next.js, Supabase, Vercel, Chart.js, etc.) with their GAMP 5 category, version, supplier, and validation status
- Serves as the META-04 computerised system register

---

## Access Registry

- **`/api/admin/access-registry`** — GET, returns current user list with roles and statuses
- Supports `?format=csv` for CSV export
- Restricted to `can_read_only()` roles (monitor, auditor, mentor, sponsor_admin, investigator)

---

## Zod Schema Validation

All API and Server Action inputs are validated with Zod schemas defined centrally in `src/lib/schemas.ts`. Schemas include:

`measurementSchema`, `participantSchema`, `updateProfileSchema`, `lockStudySchema`, `unlockStudySchema`, `createQuerySchema`, `updateQuerySchema`, `createSignatureSchema`, `createConsentRecordSchema`, `createConsentFormVersionSchema`, `createAdverseEventSchema`, `updateAdverseEventSchema`, `createDestructionRequestSchema`

---

## API Routes Reference

| Route | Methods | Purpose |
|---|---|---|
| `/api/measurements` | GET, POST, DELETE | Measurement CRUD |
| `/api/participants` | GET, POST | Participant CRUD |
| `/api/studies` | GET, POST | Study listing / creation |
| `/api/profiles` | GET, POST, PATCH, DELETE | User profile management |
| `/api/audit-log` | GET | Audit trail viewer + CSV |
| `/api/queries` | GET, POST | Query management |
| `/api/queries/[id]` | PATCH | Query lifecycle advance |
| `/api/auth/verify-credentials` | POST | Re-auth for signatures |
| `/api/signatures` | GET, POST | Electronic sign-off |
| `/api/consent` | GET, POST | Consent form versions + records |
| `/api/adverse-events` | GET, POST | AE/SAE reporting |
| `/api/adverse-events/[id]` | PATCH | AE update |
| `/api/admin/access-registry` | GET | User access registry |
| `/api/admin/lock` | POST | Study lock |
| `/api/admin/unlock` | POST | Study unlock |
| `/api/admin/export` | GET | Full JSON export + SHA-256 |
| `/api/admin/destruction-request` | POST | Data destruction record |
| `/api/admin/delegations` | GET, POST | Delegation log |

---

## Dashboard Pages

| Page | Path | Role restriction |
|---|---|---|
| Data Collection | `/data-collection` | `can_edit_data()` |
| Participants | `/participants` | all authenticated |
| Participants (read-only view) | `/participants-view` | all authenticated |
| Results | `/results` | all authenticated |
| Analysis | `/analysis` | all operational roles |
| Queries | `/queries` | all authenticated |
| Audit Log | `/audit-log` | monitor, auditor, mentor, sponsor_admin |
| Study Management | `/study-management` | mentor, sponsor_admin |
| User Management | `/user-management` | mentor, sponsor_admin |
| System Inventory | `/system-inventory` | mentor, sponsor_admin |

---

## Documentation Files

| File | Purpose |
|---|---|
| `validata-app/supabase_setup.sql` | Full Postgres schema, 26 sections, run once on a new project |
| `docs/infrastructure/supabase_bootstrap.md` | Step-by-step new Supabase project setup guide |
| `docs/quality/validation_master_plan.md` | VMP skeleton (student reference; IQ/OQ/PQ templates) |
| `docs/quality/disaster_recovery_runbook.md` | DR plan (RPO 15 min, RTO 4 hours, 4 scenarios) |
| `docs/quality/csv_periodic_review.md` | Annual computer system review checklist |
| `docs/compliance/road_to_compliance_plan.md` | ICH E6(R3) gap analysis, 117 requirements |
| `docs/compliance/ich_compliance_report.md` | Per-task implementation report |

---

## ICH E6(R3)-Inspired Features

The following features were added after a structured gap analysis against ICH E6(R3) GCP. They represent the *code-level direction* of the requirements.

> These features **do not constitute certified GCP compliance.** See [`DISCLAIMER.md`](DISCLAIMER.md).

| ICH Category | Code-level implementation |
|---|---|
| AUDIT-01–08 | `audit_log` table; SECURITY DEFINER triggers on all clinical tables; no-delete RLS on audit rows |
| INT-01–03 | `lock_state` + RLS enforcement on locked studies; `created_by` on all rows; UTC timestamps |
| INT-02 (Attribution) | `created_by` UUID server-injected; `actor` in audit log captured by trigger, not application code |
| AUDIT-06 (UTC) | All `created_at` / `updated_at` / `changed_at` columns are `TIMESTAMPTZ`; UI displays UTC |
| RET-01–03 | Soft-delete columns (`deleted_at`, `deleted_by`, `retention_hold`); hard DELETE blocked by RLS; 15-year destruction check in API |
| AUTH-01–04 | 9-role CHECK constraint in SQL; `can_edit_data()` + `can_read_only()` SQL and TS helpers; all RLS policies updated |
| AUTH-02 (RBAC) | `monitor`, `auditor`, `irb_reviewer` have differentiated read-only access |
| CAP-04 (Queries) | Full query lifecycle: `open` → `answered` → `resolved` → `closed`; `answered_by`, `resolved_by`, `closed_by` with timestamps |
| SIG-01–03 | Re-authentication before signing; legal-meaning text; `signatures` table with UTC timestamp |
| CONSENT-01–04 | `consent_form_versions` (versioned, IRB-dated); `consent_records` (method, witness, withdrawal) |
| SAFETY-01–04 | `adverse_events` table; auto deadline calculation (7/15 days per ICH E2A); outcome tracking |
| SEC-01 | `NEXT_PUBLIC_DEMO_ENABLED=false` disables cookie bypass; enforced in both middleware and server auth |
| SEC-02 (Cookies) | `SameSite=Strict`; conditional `Secure` flag via `secureFlag()` helper |
| RET-04 (Export) | `/api/admin/export` returns JSON + SHA-256 integrity hash |
| META-04 (System Reg.) | `/system-inventory` page lists all components with GAMP 5 category and validation status |
| BCP-01–02 | `docs/quality/disaster_recovery_runbook.md` (RPO 15 min / RTO 4 h); Supabase PITR instructions |
| CSV-01–04 | `docs/quality/validation_master_plan.md` (VMP/IQ/OQ/PQ skeleton); `docs/quality/csv_periodic_review.md` |
| ACC-01 | `/api/admin/access-registry` listing with CSV export |
| DEL-01 | `delegations` table + API route |
| BLIND-01–02 | `treatment_assignments` (mentor-only RLS); `unblinding_events` table |
| IP-01–02 | `ip_inventory` + `ip_dispensations` tables |
| ORG-01 | `organisations` table; `profiles.organisation_id` FK |
