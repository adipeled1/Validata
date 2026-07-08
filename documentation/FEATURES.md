# Validata — Full Feature Description

This document describes every feature in the Validata EDC platform in detail, including the ICH E6(R3)-inspired additions.

For a short overview see [`README.md`](README.md).
For the full disclaimer see [`DISCLAIMER.md`](DISCLAIMER.md).
For a diagram of the database schema see [`SCHEMA.md`](SCHEMA.md).

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
Next.js Server Components + Server Actions (app/actions/*)
    — dashboard pages, participant/study/measurement creation
    ↓
Next.js API Routes (serverless, src/app/api/*)
    — REST endpoints for reads, updates, and admin operations
    ↓
Supabase (PostgreSQL + Auth)
    — RLS policies, SECURITY DEFINER triggers, audit log
```

All database writes happen through server-side code only. The Supabase anon key reaches the browser but no client-side code writes directly to the database — every mutation goes through a Server Action or API route that validates the session first.

---

## Authentication and Session Management

- Email + password authentication via Supabase Auth
- Sessions managed with signed cookies (`SameSite=Strict`, conditional `Secure` flag via `secureFlag()` in `src/lib/cookies.ts`)
- Middleware (`proxy.ts`) validates the session cookie on every request and redirects to `/login` if invalid
- **Demo mode** — dev-only bypass via `NEXT_PUBLIC_DEMO_ENABLED=true`; disabled with `NEXT_PUBLIC_DEMO_ENABLED=false` in production; demo sessions are per-visitor isolated and never touch real data
- New users are auto-created with role `team_member` and status `candidate` (auto-expires after 30 days if never approved) via a database trigger; a mentor/admin must approve before they can access the dashboard

---

## Role-Based Access Control (9 Roles)

The platform implements a 9-role model, defined once in `src/lib/permissions.ts` and mirrored in the SQL RLS policies (`supabase_setup.sql`) so the two layers can't silently drift apart.

| Role | Description |
|---|---|
| `admin` | Separation-of-duties tier above mentor; same global access, plus sole authority to manage mentor/admin accounts |
| `mentor` | Highest operational authority; covers the professor/PI and developers |
| `investigator` | PI / sub-investigator; can enter and correct data, sign off, delegate |
| `site_coordinator` | Site research coordinator; can enter data |
| `data_manager` | Data entry, correction, and query resolution; cannot approve/sign |
| `monitor` | CRA / clinical monitor; read-only + can raise/resolve queries |
| `auditor` | Read-only access to audit trail and signatures |
| `irb_reviewer` | Read-only access to consent records and study protocols |
| `team_member` | Default role for new registrations, before a real role is granted |

**Permission sets** (`src/lib/permissions.ts`, mirrored by SQL helper functions of the same shape):

| Set | Roles | Used for |
|---|---|---|
| `ADMIN_ROLES` | admin, mentor | Study lock/unlock, user management, system inventory |
| `EDIT_ROLES` | admin, mentor, investigator, site_coordinator, data_manager | Creating/updating clinical data |
| `OVERSIGHT_ROLES` | monitor, auditor, irb_reviewer | Read-only oversight |
| `READABLE_ROLES` | `EDIT_ROLES` + `OVERSIGHT_ROLES` | Viewing study-level data |
| `SIGNING_ROLES` | admin, mentor, investigator | Electronic signatures |
| `DELEGATION_ROLES` | admin, mentor, investigator | Managing delegations |
| `QUERY_MUTATE_ROLES` | admin, mentor, investigator, data_manager, monitor | Answering/resolving queries |
| `AUDIT_VIEWER_ROLES` | admin, mentor, monitor, auditor | Audit log / access registry |

---

## Per-Study Access Control

- **`study_members`** table maps a user to a study with a `study_role` snapshot (the user's platform role *at the time they were granted access* — never updated afterward; live authorization always reads the current `profiles.role`).
- `mentor`/`admin` are treated as global — unrestricted across every study. Every other role must be an explicit member of a study to read or write its data (`is_study_member()` SQL helper, enforced in RLS).
- Managed from the **Study Management** page and `/api/admin/study-members` (GET, POST, DELETE).

---

## Study Management

- Create, view, and switch between multiple studies
- `activation_status` field: `pending`, `active`, `suspended`, `closed`
- **Study lock** — mentor/admin can lock a study for analysis; locked studies reject all INSERT/UPDATE on measurements and participants at the RLS level. Lock state (`lock_state`, `locked_at`, `locked_by`, `lock_reason`) is stored on the study row
- **Soft delete** — studies are never hard-deleted; `deleted_at`, `deleted_by`, `retention_hold` columns preserve the record. RLS filters soft-deleted studies from all normal queries

---

## Participant Management

- Add, view, and update participants per study (create via the `createParticipantAction` Server Action)
- Fields: `age`, `gender`, `health_status` (`Healthy` / `Ankle Injured`), `status` (`Active` / `Completed` / `Dropped`), `status_reason`, `enrollment_date`
- `created_by` UUID stored server-side so the creating user is always attributed
- A `BEFORE UPDATE` trigger enforces that only `status` and `status_reason` can change after insert — every other column is immutable
- Consent is tracked in a separate dedicated table (see **Consent Record Management** below); there is no boolean consent flag on the participant row

---

## Measurement Data Collection

- Manual entry of measurement values per participant, or batch import from XLSX/CSV/JSON files via SheetJS
- Fields: `goniometer` (manual reference value), `ai_model` (AI-predicted value), `test_date`, `notes`
- `capture_method` (`manual_entry` / `file_import`) and `is_valid` / `validity_reason` for data quality annotation — a measurement's raw values are never edited in place once written; only its validity flag can be toggled
- A `BEFORE UPDATE` trigger enforces this at the database level, independent of the application layer
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

**Data endorsement** — investigators, mentors, and admins can electronically endorse the analysis dataset. The "Endorse Data" button opens a modal that requires re-entry of the user's password before writing a signed record (see **Electronic Signatures** below).

---

## Audit Trail

- Every INSERT, UPDATE, and DELETE on `participants`, `measurements`, `studies`, `profiles`, `queries`, `signatures`, `study_members`, and every other clinical/compliance table generates a row in `audit_log`
- Written by a `SECURITY DEFINER` Postgres trigger function (`log_audit_event()`) so `auth.uid()` is always the real authenticated user — application code cannot forge the actor
- Stored fields: `table_name`, `action`, `record_id`, `actor_id` (UUID), `actor_email`, `old_value` (JSONB), `new_value` (JSONB), `reason`, `occurred_at` (UTC)
- Special action types beyond plain INSERT/UPDATE/DELETE: `ROLE_CHANGE`, `STATUS_CHANGE`, `SOFT_DELETE`, `DESTRUCTION_REQUEST`, `DESTRUCTION_APPROVED`
- **Audit Log page** (`/audit-log`) — filterable by study, actor, action type, and date range
- RLS on `audit_log` restricts SELECT to `AUDIT_VIEWER_ROLES` (admin, mentor, monitor, auditor)

---

## Electronic Signatures

- Implemented via the `signatures` table
- Flow: user clicks "Endorse Data" → re-authenticates via `/api/auth/verify-credentials`, which mints a single-use, short-lived signing token → `/api/signatures` requires and atomically consumes that token before writing the signature row (prevents replaying a request without re-authenticating)
- Signature record includes: `study_id`, `signer_id`, `signer_email`, `record_type`, `record_id`, `milestone` (e.g. `data_lock`, `final_report`), `meaning` (the legal-meaning text shown to the user at signing time), `signed_at` (UTC)
- Only `SIGNING_ROLES` (admin, mentor, investigator) may sign

---

## Query Management

Full data-query lifecycle, used when monitors or data managers raise questions about specific data points.

States: `open` → `answered` → `resolved` → `closed`

- **`/api/queries`** — GET (list) + POST (create)
- **`/api/queries/[id]`** — PATCH (advance lifecycle, set `answered_by` / `resolved_by` / `closed_by` with timestamps)
- **`/queries` dashboard page** — list all queries with inline action buttons for state transitions
- Only `QUERY_MUTATE_ROLES` (admin, mentor, investigator, data_manager, monitor) can answer/resolve/close a query — `auditor`/`irb_reviewer` stay read-only

---

## Consent Record Management

Versioned consent forms decoupled from participant records.

- **`consent_form_versions`** — each version has an IRB approval date (`irb_approved_at`), an `activated_at` date, and a `content_hash` (SHA-256 of the form content); only `CONSENT_VERSION_ROLES` (admin, mentor) can create/activate a version
- **`consent_records`** — links a participant to a form version; records `consented_at`, `method` (`written` / `electronic` / `verbal_with_witness`), `copy_delivered`, and `witnessed_by` (required for verbal consent)
- **`/api/consent`** — POST supports `action: create_version` and `action: record_consent`

---

## Adverse Event / SAE Reporting

- **`adverse_events`** table: `participant_id`, `study_id`, `ae_type` (`ae` / `sae` / `susar`), `description`, `severity` (`mild` / `moderate` / `severe` / `life_threatening` / `fatal`), `causality`, `expectedness` (`expected` / `unexpected`), `onset_date`, `report_date`, `resolution_date`, `outcome`, `authority_deadline`, `authority_submitted_at`
- **Automatic deadline calculation** (server-side, in `/api/adverse-events`):
  - Fatal or life-threatening + unexpected → **7-day** reporting deadline (per ICH E2A)
  - All other unexpected → **15-day** deadline
  - Expected events → no automatic deadline
- **`/api/adverse-events`** — GET + POST
- **`/api/adverse-events/[id]`** — PATCH (update outcome/resolution)

---

## User Management

- `admin`/`mentor` roles can view all registered users and approve or change role/status with a mandatory reason field (`change_reason`, logged on the profile row)
- Users in `candidate` or `pending` status cannot access the dashboard
- Expired, never-approved candidates are cleaned up automatically by a daily `pg_cron` job (`cleanup_expired_candidates()`); `/api/admin/cleanup-candidates` remains available for an on-demand manual trigger

---

## Data Export and Archival

- **`/api/admin/export`** — exports all clinical tables as a single JSON object, computes a SHA-256 hash of the payload, returns both. Supports integrity verification.
- **`/api/admin/destruction-request`** — checks: study must be soft-deleted, no `retention_hold`, and at least 15 years old; records a `DESTRUCTION_REQUEST` audit entry with reason

---

## Delegation of Duties

- **`delegations`** table tracks formal delegation from one user to another (`role_delegated`, `task_description`, `effective_from`/`effective_to`) for a specific study
- **`/api/admin/delegations`** — GET + POST, restricted to `DELEGATION_ROLES` (admin, mentor, investigator)

---

## Blinding / Treatment Assignment Vault

- **`treatment_assignments`** table — participant → treatment arm mapping, readable only by `mentor`/`admin` via RLS (blinded-study default)
- **`unblinding_events`** — records any emergency unblinding request with reason, requester, approver, and the revealed arm
- **`organisations`** table — foundation for multi-sponsor / multi-site configuration (`profiles.organisation_id` FK)

---

## IP (Investigational Product) Accountability

- **`ip_inventory`** — batch/lot records (batch number, treatment arm, quantity received, expiry date)
- **`ip_dispensations`** — records each dispensing event linked to a participant and an inventory batch

---

## System Inventory Register

- **`/system-inventory` dashboard page** — visible to `ADMIN_ROLES` (admin, mentor) only
- Lists all software components (Next.js, Supabase, Vercel, Chart.js, etc.) with their GAMP 5 category, version, supplier, and validation status
- Serves as the META-04 computerised system register

---

## Access Registry

- **`/api/admin/access-registry`** — GET, returns current user list with roles and statuses
- Restricted to `ACCESS_REGISTRY_ROLES` (admin, mentor, monitor, auditor)

---

## Zod Schema Validation

All API and Server Action inputs are validated with Zod schemas defined centrally in `src/lib/schemas.ts`, covering measurements, participants, profile updates, study lock/unlock, queries, signatures, consent, and adverse events.

---

## API Routes Reference

| Route | Methods | Purpose |
|---|---|---|
| `/api/measurements` | GET, POST | Measurement listing / creation |
| `/api/participants` | GET | Participant listing (creation is a Server Action) |
| `/api/studies` | GET | Study listing (creation is a Server Action) |
| `/api/profiles` | GET, PATCH, DELETE | User profile management |
| `/api/audit-log` | GET | Audit trail viewer |
| `/api/queries` | GET, POST | Query management |
| `/api/queries/[id]` | PATCH | Query lifecycle advance |
| `/api/auth/verify-credentials` | POST | Re-auth, mints a signing token |
| `/api/signatures` | GET, POST | Electronic sign-off (consumes a signing token) |
| `/api/consent` | GET, POST | Consent form versions + records |
| `/api/adverse-events` | GET, POST | AE/SAE reporting |
| `/api/adverse-events/[id]` | PATCH | AE update |
| `/api/admin/access-registry` | GET | User access registry |
| `/api/admin/study-members` | GET, POST, DELETE | Per-study membership |
| `/api/admin/lock` / `/api/admin/unlock` | POST | Study lock / unlock |
| `/api/admin/export` | GET | Full JSON export + SHA-256 |
| `/api/admin/destruction-request` | POST | Data destruction record |
| `/api/admin/delegations` | GET, POST | Delegation log |
| `/api/admin/cleanup-candidates` | POST | Manual expired-candidate cleanup |

---

## Dashboard Pages

| Page | Path | Role restriction |
|---|---|---|
| Data Collection | `/data-collection` | all authenticated (writes gated to `EDIT_ROLES`) |
| Participants | `/participants` | all authenticated |
| Results | `/results` | all authenticated |
| Analysis | `/analysis` | `READABLE_ROLES` |
| Queries | `/queries` | all authenticated (mutations gated to `QUERY_MUTATE_ROLES`) |
| Adverse Events | `/adverse-events` | `READABLE_ROLES` (create: `EDIT_ROLES`) |
| Consent Records | `/consent-records` | `READABLE_ROLES` (versioning: `CONSENT_VERSION_ROLES`) |
| Delegation Log | `/delegation-log` | `READABLE_ROLES` (create: `DELEGATION_ROLES`) |
| Signatures | `/signatures` | `READABLE_ROLES` |
| Audit Log | `/audit-log` | `AUDIT_VIEWER_ROLES` |
| Study Overview | `/study-overview` | all authenticated (approvals: `ADMIN_ROLES`) |
| Study Management | `/study-management` | `ADMIN_ROLES` |
| User Management | `/user-management` | `ADMIN_ROLES` |
| System Inventory | `/system-inventory` | `ADMIN_ROLES` |

---

## Documentation Files

| File | Purpose |
|---|---|
| `validata-app/supabase_setup.sql` | Full Postgres schema, RLS policies, and triggers — sufficient to bootstrap a new Supabase project |
| `SCHEMA.md` | Entity-relationship diagram of the database schema |
| `docs/infrastructure/supabase_bootstrap.md` | Step-by-step new Supabase project setup guide |
| `docs/quality/validation_master_plan.md` | VMP skeleton (student reference; IQ/OQ/PQ templates) |
| `docs/quality/disaster_recovery_runbook.md` | DR plan (RPO 15 min, RTO 4 hours) |
| `docs/quality/csv_periodic_review.md` | Annual computer system review checklist |
| `docs/compliance/road_to_compliance_plan.md` | ICH E6(R3) gap analysis |
| `docs/compliance/ich_compliance_report.md` | Per-task implementation report |

---

## ICH E6(R3)-Inspired Features

Validata includes a set of features added in the *direction of* ICH E6(R3) Good Clinical Practice (GCP). The ICH E6(R3) guideline covers audit trail integrity, data attribution, electronic signatures, role-based access, query management, consent records, adverse event reporting, study locking, computerised system validation, and many other areas.

The following additions to this codebase were directly inspired by those requirements:

- Append-only audit log generated by database triggers (SECURITY DEFINER, so the actor is always the authenticated user)
- 9-role access control model with differentiated SQL and TypeScript helpers
- Study lock mechanism enforced at the Row-Level Security layer
- Electronic signature with re-authentication and legal-meaning text display
- Full data-query lifecycle (open → answered → resolved → closed)
- Versioned consent form records linked to IRB approval dates
- Adverse event / SAE recording with automatic ICH E2A reporting deadline calculation
- Soft-delete with retention hold on studies; hard DELETE blocked by RLS
- SHA-256 archival integrity hash on data exports
- Demo mode gate disabled in production (`NEXT_PUBLIC_DEMO_ENABLED=false`)
- Cookie hardening (`SameSite=Strict`, conditional `Secure` flag)
- System component inventory register (GAMP 5 categories)
- Disaster recovery runbook and computerised system validation master plan skeleton

The following features were added after a structured gap analysis against ICH E6(R3) GCP. They represent the *code-level direction* of the requirements.

> These features **do not constitute certified GCP compliance.** See [`DISCLAIMER.md`](DISCLAIMER.md).

| ICH Category | Code-level implementation |
|---|---|
| AUDIT-01–08 | `audit_log` table; SECURITY DEFINER triggers on all clinical tables; no-delete RLS on audit rows |
| INT-01–03 | `lock_state` + RLS enforcement on locked studies; `created_by` on all rows; UTC timestamps |
| INT-02 (Attribution) | `created_by` UUID server-injected; `actor_id` in audit log captured by trigger, not application code |
| AUDIT-06 (UTC) | All timestamp columns are `TIMESTAMPTZ`; UI displays UTC |
| RET-01–03 | Soft-delete columns (`deleted_at`, `deleted_by`, `retention_hold`); hard DELETE blocked by RLS; 15-year destruction check in API |
| AUTH-01–04 | 9-role CHECK constraint in SQL; permission sets mirrored between `permissions.ts` and RLS policies |
| AUTH-02 (RBAC) | `monitor`, `auditor`, `irb_reviewer` have differentiated read-only access |
| ACC-01–03 | `study_members` per-study access control; `/api/admin/access-registry`; `delegations` table |
| CAP-04 (Queries) | Full query lifecycle: `open` → `answered` → `resolved` → `closed`; `answered_by`, `resolved_by`, `closed_by` with timestamps |
| SIG-01–03 | Re-authentication before signing via single-use signing tokens; legal-meaning text; `signatures` table with UTC timestamp |
| CONSENT-01–04 | `consent_form_versions` (versioned, IRB-dated); `consent_records` (method, witness, delivery) |
| SAFETY-01–04 | `adverse_events` table; auto deadline calculation (7/15 days per ICH E2A); outcome tracking |
| SEC-01 | `NEXT_PUBLIC_DEMO_ENABLED=false` disables the demo-mode bypass; enforced in both middleware and server auth |
| SEC-02 (Cookies) | `SameSite=Strict`; conditional `Secure` flag via `secureFlag()` helper |
| RET-04 (Export) | `/api/admin/export` returns JSON + SHA-256 integrity hash |
| META-04 (System Reg.) | `/system-inventory` page lists all components with GAMP 5 category and validation status |
| BCP-01–02 | `docs/quality/disaster_recovery_runbook.md` (RPO 15 min / RTO 4 h); Supabase PITR instructions |
| CSV-01–04 | `docs/quality/validation_master_plan.md` (VMP/IQ/OQ/PQ skeleton); `docs/quality/csv_periodic_review.md` |
| DEL-01 | `delegations` table + API route |
| BLIND-01–03 | `treatment_assignments` (mentor/admin-only RLS); `unblinding_events` table |
| IP-01–04 | `ip_inventory` + `ip_dispensations` tables |
| ORG-01 | `organisations` table; `profiles.organisation_id` FK |
