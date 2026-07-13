-- Validata database schema.
--
-- This is the complete, current schema in one idempotent script - every
-- CREATE TABLE/FUNCTION/POLICY reflects the final desired state directly,
-- not a chronological record of how it got there. Safe to run repeatedly
-- against the same database (everything is IF NOT EXISTS / OR REPLACE /
-- DROP-then-CREATE), and sufficient on its own to bootstrap a brand-new
-- Supabase project from empty.
--
-- Organized by concern: tables, helper functions, row-level security,
-- triggers, RPCs, indexes, scheduled jobs.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organisations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    type       TEXT NOT NULL DEFAULT 'sponsor' CHECK (type IN ('sponsor', 'cro', 'site', 'irb')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 'admin' sits above 'mentor' purely for account-safety separation of
-- duties: same global access as mentor, plus the sole authority to manage
-- other mentor/admin accounts, so two mentors can't lock each other out or
-- demote each other. Every other operational role maps to an ICH E6(R3)
-- stakeholder: investigator (PI/sub-I), site_coordinator (CRC), data_manager
-- (DM), monitor (CRA), auditor (GCP auditor), irb_reviewer (ethics
-- committee). 'team_member' is the default an applicant is promoted to on
-- approval - it can log in and see the shell, but has near-zero functional
-- permissions until a mentor/admin assigns it an operational role.
--
-- 'applicant' is a dedicated, non-operational role for a new registration
-- that has not yet been approved: it is fully blocked from the application
-- (every read/write, via RLS and API routes) and is redirected to an
-- onboarding block screen instead of the dashboard. It carries its own
-- statuses ('wait_email_confirm' / 'wait_approval') that no other role may
-- ever have - the composite CHECK below makes that a hard DB invariant, not
-- just an application convention: an applicant is always in one of those two
-- statuses, and every other role is always 'active' or 'suspended'. This
-- means a role/status pair can never describe someone who is "half approved"
-- or an operational role stuck in a pending state.
--
-- There is no in-app path to create the first admin account (only an admin
-- can promote someone to admin/mentor). Seed it directly, once:
--   UPDATE public.profiles SET role = 'admin', status = 'active' WHERE email = '<head mentor email>';
CREATE TABLE IF NOT EXISTS public.profiles (
    id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                TEXT NOT NULL,
    role                 TEXT NOT NULL DEFAULT 'applicant'
                             CHECK (role IN (
                                 'applicant',
                                 'admin', 'mentor', 'team_member',
                                 'investigator', 'site_coordinator',
                                 'data_manager', 'monitor', 'auditor', 'irb_reviewer'
                             )),
    status               TEXT NOT NULL DEFAULT 'wait_email_confirm'
                             CHECK (status IN ('wait_email_confirm', 'wait_approval', 'active', 'suspended', 'deleted')),
    -- Applicant statuses are exclusive to the applicant role; every other
    -- role is always active, suspended, or deleted. Keeps the onboarding
    -- lifecycle a DB-enforced invariant instead of something only the
    -- application layer promises to maintain.
    CONSTRAINT profiles_applicant_status_exclusive CHECK (
        (role = 'applicant' AND status IN ('wait_email_confirm', 'wait_approval'))
        OR (role <> 'applicant' AND status IN ('active', 'suspended', 'deleted'))
    ),
    change_reason        TEXT, -- why a role/status change happened; captured by the audit trigger
    candidate_expires_at TIMESTAMPTZ, -- applicants are auto-deleted after this if never approved
    organisation_id      UUID REFERENCES public.organisations(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    -- 'deleted' is the authoritative signal that an ever-approved account was
    -- soft-deleted (see User Registry's "Delete"/"Reactivate" actions and
    -- ROLES_AND_REGISTRATION.md) - this column is just the audit timestamp of when that
    -- happened, not something callers should branch on. It's unrelated to
    -- deleting a not-yet-approved applicant, which is a genuine hard delete
    -- of the row (see delete_candidate_user() below) and never sets this.
    deleted_at           TIMESTAMPTZ
);

-- Every study has its own recruitment goal. Soft-delete only (deleted_at) -
-- hard-deleting a study would permanently destroy trial data; retention_hold
-- blocks destruction while a sponsor-issued hold is active. lock_state
-- freezes further data entry once a study reaches database lock.
CREATE TABLE IF NOT EXISTS public.studies (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL UNIQUE,
    recruitment_goal   INTEGER NOT NULL DEFAULT 50,
    created_by         UUID REFERENCES auth.users(id),
    activation_status  TEXT NOT NULL DEFAULT 'pending'
                           CHECK (activation_status IN ('pending', 'active', 'suspended', 'closed')),
    lock_state         TEXT NOT NULL DEFAULT 'open' CHECK (lock_state IN ('open', 'locked')),
    locked_at          TIMESTAMPTZ,
    locked_by          UUID REFERENCES auth.users(id),
    lock_reason        TEXT,
    deleted_at         TIMESTAMPTZ,
    deleted_by         UUID REFERENCES auth.users(id),
    retention_hold     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

INSERT INTO public.studies (name, recruitment_goal)
VALUES ('braude''s_research_1', 50), ('braude''s_research_2', 30)
ON CONFLICT (name) DO NOTHING;

-- Per-study access control: mentor/admin are global (unrestricted across
-- every study by design); every other role must additionally appear here to
-- read or write that study's data (see is_study_member() below). study_role
-- is an immutable snapshot of the user's global profile.role at the moment
-- they were granted access - it is NEVER updated afterward, even if their
-- global role later changes. It's historical grant-time context only
-- ("what role did this person have when they joined this study") and must
-- NOT be treated as their current role - always read profiles.role (joined
-- live) for anything authorization- or display-related.
CREATE TABLE IF NOT EXISTS public.study_members (
    study_id   UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_role TEXT NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (study_id, user_id)
);

-- id is a human-readable code (e.g. "P-1001") that's only unique within a
-- study, so the primary key is composite (id, study_id) rather than id
-- alone - each study gets its own independent P-1001, P-1002... sequence
-- (see next_participant_id() below for atomic allocation).
CREATE TABLE IF NOT EXISTS public.participants (
    id              TEXT NOT NULL,
    study_id        UUID NOT NULL REFERENCES public.studies(id),
    age             INTEGER,
    gender          TEXT,
    health_status   TEXT CHECK (health_status IN ('Healthy', 'Ankle Injured')),
    status          TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Dropped')),
    status_reason   TEXT,
    enrollment_date DATE,
    created_by      UUID REFERENCES auth.users(id),
    PRIMARY KEY (id, study_id)
);

-- Once written, a measurement's raw values are never edited in place - only
-- is_valid/validity_reason can change (a one-way "soft delete" excluding it
-- from statistics), enforced for real by enforce_measurements_immutability()
-- below, not just by convention.
CREATE TABLE IF NOT EXISTS public.measurements (
    id              BIGSERIAL PRIMARY KEY,
    participant_id  TEXT NOT NULL,
    study_id        UUID NOT NULL,
    goniometer      NUMERIC,
    ai_model        NUMERIC,
    test_date       DATE,
    notes           TEXT,
    timestamp       TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'UTC'),
    is_valid        BOOLEAN NOT NULL DEFAULT true,
    validity_reason TEXT,
    created_by      UUID REFERENCES auth.users(id),
    capture_method  TEXT CHECK (capture_method IN ('manual_entry', 'file_import')),
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

-- Atomic per-study counter backing next_participant_id() below - never
-- accessed directly by the app, only through that function.
CREATE TABLE IF NOT EXISTS public.participant_id_counters (
    study_id UUID PRIMARY KEY REFERENCES public.studies(id) ON DELETE CASCADE,
    last_id  INTEGER NOT NULL DEFAULT 1000
);

-- Immutable, append-only. Application code may only INSERT (via
-- log_audit_event() below) - there are no UPDATE/DELETE policies, and this
-- table is never truncated by application code.
CREATE TABLE IF NOT EXISTS public.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    actor_id    UUID REFERENCES auth.users(id),
    actor_email TEXT NOT NULL DEFAULT 'system',
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN (
                    'INSERT', 'UPDATE', 'DELETE',
                    'ROLE_CHANGE', 'STATUS_CHANGE',
                    'LOCK', 'UNLOCK',
                    'SIGN_OFF',
                    'SOFT_DELETE', 'DESTRUCTION_REQUEST'
                )),
    old_value   JSONB,
    new_value   JSONB,
    reason      TEXT,
    study_id    UUID REFERENCES public.studies(id)
);

-- Data queries raised against specific field values. Full lifecycle:
-- open -> answered -> resolved -> closed.
CREATE TABLE IF NOT EXISTS public.queries (
    id           BIGSERIAL PRIMARY KEY,
    study_id     UUID NOT NULL REFERENCES public.studies(id),
    record_table TEXT NOT NULL, -- 'measurements' or 'participants'
    record_id    TEXT NOT NULL,
    field_name   TEXT NOT NULL,
    severity     TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved', 'closed')),
    raised_by    UUID NOT NULL REFERENCES auth.users(id),
    raised_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    query_text   TEXT NOT NULL,
    answered_by  UUID REFERENCES auth.users(id),
    answered_at  TIMESTAMPTZ,
    answer_text  TEXT,
    resolved_by  UUID REFERENCES auth.users(id),
    resolved_at  TIMESTAMPTZ,
    closed_by    UUID REFERENCES auth.users(id),
    closed_at    TIMESTAMPTZ
);

-- Electronic sign-off on study data milestones. Append-only - no
-- UPDATE/DELETE policies; a signature must mean what it says, forever.
CREATE TABLE IF NOT EXISTS public.signatures (
    id           BIGSERIAL PRIMARY KEY,
    study_id     UUID NOT NULL REFERENCES public.studies(id),
    signer_id    UUID NOT NULL REFERENCES auth.users(id),
    signer_email TEXT NOT NULL,
    record_type  TEXT NOT NULL, -- 'study', 'participant', 'measurement', etc.
    record_id    TEXT NOT NULL,
    milestone    TEXT NOT NULL, -- e.g. 'data_lock', 'final_report', 'interim_analysis'
    meaning      TEXT NOT NULL, -- legal-meaning text shown to the signer at signing time
    signed_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Versioned, IRB-approved consent forms - the document. Participant consent
-- events (below) reference a specific version, so it's always provable
-- exactly which wording a participant agreed to.
CREATE TABLE IF NOT EXISTS public.consent_form_versions (
    id              BIGSERIAL PRIMARY KEY,
    study_id        UUID NOT NULL REFERENCES public.studies(id),
    version         TEXT NOT NULL, -- e.g. '1.0', '2.1'
    irb_approved_at TIMESTAMPTZ,   -- NULL = pending IRB approval
    activated_at    TIMESTAMPTZ,   -- NULL = not yet active
    content_hash    TEXT,          -- SHA-256 of the consent form content
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    UNIQUE (study_id, version)
);

-- An individual participant's consent event - the attestation that consent
-- happened, how, and who recorded it. Append-only, no UPDATE policy.
CREATE TABLE IF NOT EXISTS public.consent_records (
    id              BIGSERIAL PRIMARY KEY,
    participant_id  TEXT NOT NULL,
    study_id        UUID NOT NULL,
    form_version_id BIGINT NOT NULL REFERENCES public.consent_form_versions(id),
    consented_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    method          TEXT NOT NULL DEFAULT 'written'
                        CHECK (method IN ('written', 'electronic', 'verbal_with_witness')),
    copy_delivered  BOOLEAN NOT NULL DEFAULT FALSE,
    witnessed_by    UUID REFERENCES auth.users(id), -- required for verbal consent
    recorded_by     UUID NOT NULL REFERENCES auth.users(id),
    notes           TEXT,
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

-- AE/SAE/SUSAR reporting. authority_deadline is calculated per ICH E2A:
-- fatal/life-threatening + unexpected = 7 calendar days; other unexpected =
-- 15 days; expected events get no automatic deadline.
CREATE TABLE IF NOT EXISTS public.adverse_events (
    id                     BIGSERIAL PRIMARY KEY,
    study_id               UUID NOT NULL REFERENCES public.studies(id),
    participant_id         TEXT NOT NULL,
    ae_type                TEXT NOT NULL DEFAULT 'ae' CHECK (ae_type IN ('ae', 'sae', 'susar')),
    description            TEXT NOT NULL,
    severity               TEXT NOT NULL
                               CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening', 'fatal')),
    causality              TEXT NOT NULL
                               CHECK (causality IN ('unrelated', 'unlikely', 'possible', 'probable', 'definite')),
    expectedness           TEXT NOT NULL DEFAULT 'unexpected' CHECK (expectedness IN ('expected', 'unexpected')),
    onset_date             DATE,
    report_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    resolution_date        DATE,
    outcome                TEXT CHECK (outcome IN (
                               'recovered', 'recovering', 'not_recovered',
                               'recovered_with_sequelae', 'fatal', 'unknown'
                           )),
    authority_deadline     DATE,
    authority_submitted_at TIMESTAMPTZ,
    reported_by            UUID NOT NULL REFERENCES auth.users(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    notes                  TEXT,
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

-- Formal delegation of duties to sub-investigators/site staff - a paper
-- trail for accountability, not an access grant. Nothing in the app checks
-- this table before letting someone do something; what a person can
-- actually do is governed entirely by their profiles.role. revoked_at
-- (delegator pulls it early) and completed_at (delegate finishes it) are
-- separate, mutually exclusive terminal states - see
-- enforce_delegations_lifecycle() below.
CREATE TABLE IF NOT EXISTS public.delegations (
    id               BIGSERIAL PRIMARY KEY,
    study_id         UUID NOT NULL REFERENCES public.studies(id),
    delegated_to     UUID NOT NULL REFERENCES auth.users(id),
    task_description TEXT NOT NULL,
    delegated_by     UUID NOT NULL REFERENCES auth.users(id),
    effective_from   DATE NOT NULL,
    effective_to     DATE,
    revoked_at       TIMESTAMPTZ,
    revoked_by       UUID REFERENCES auth.users(id),
    completed_at     TIMESTAMPTZ,
    completed_by     UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Single-use, short-lived tokens minted only after a successful password
-- re-check, required and atomically consumed by POST /api/signatures - so
-- signing can never be replayed without presenting a password each time.
CREATE TABLE IF NOT EXISTS public.signing_tokens (
    token       TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose     TEXT NOT NULL DEFAULT 'signature',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

-- ============================================================
-- Helper functions (used throughout RLS policies below)
-- ============================================================

-- SECURITY DEFINER so these can read public.profiles without recursing
-- through profiles' own RLS policies.
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.role IN ('mentor', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The one way an applicant (role = 'applicant', blocked from SELECTing
-- profiles directly - see the "Allow users to view profiles" policy) can
-- learn their own onboarding state, so the dashboard can pick between the
-- "Check Your Inbox" and "Awaiting Mentor Approval" screens. Returns only
-- the caller's own status - never their role, never any other user's row,
-- never NULL-vs-missing-row ambiguity beyond an empty result for a caller
-- with no profile at all (shouldn't happen post-handle_new_user, but is
-- handled by simply returning no row rather than raising).
CREATE OR REPLACE FUNCTION public.my_onboarding_status()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.profiles WHERE id = auth.uid();
    RETURN v_status;
END;
$$;

-- True for roles that may insert/update clinical data.
CREATE OR REPLACE FUNCTION public.can_edit_data()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager')
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- True for any operational role (every role except bare team_member).
CREATE OR REPLACE FUNCTION public.can_read_only()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN (
              'admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager',
              'monitor', 'auditor', 'irb_reviewer'
          )
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mirrors permissions.ts::DELEGATION_ROLES - investigators legitimately
-- delegate duties to site staff, not just admin/mentor.
CREATE OR REPLACE FUNCTION public.can_manage_delegations()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'investigator')
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mirrors permissions.ts::QUERY_MUTATE_ROLES - auditor/irb_reviewer must
-- stay read-only, so they're deliberately excluded here even though they're
-- included in can_read_only().
CREATE OR REPLACE FUNCTION public.can_mutate_queries()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'investigator', 'data_manager', 'monitor')
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Per-study scoping: mentor/admin are global by design; every other role
-- must be listed in study_members for the specific study being accessed.
-- Without this, study_members would only record who's assigned to a study
-- without actually restricting data access to it.
CREATE OR REPLACE FUNCTION public.is_study_member(p_study_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF public.is_mentor() THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.study_members
        WHERE study_id = p_study_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.organisations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studies                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_id_counters ENABLE ROW LEVEL SECURITY; -- no policies - only reachable via next_participant_id()
ALTER TABLE public.audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_form_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adverse_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_tokens          ENABLE ROW LEVEL SECURITY;

-- profiles
-- Applicants (role = 'applicant') are excluded from reading their own row
-- here - onboarding lifecycle restructure: "blocked from every possible
-- database read or write action". An applicant's own status is instead
-- readable only through the narrow public.my_onboarding_status() RPC below,
-- which returns nothing but the caller's own status - not their role, not
-- any other column, and nothing about anyone else. Mentors still see every
-- profile, including applicants, via the is_mentor() branch (needed for the
-- User Registry approval queue).
DROP POLICY IF EXISTS "Allow users to view profiles" ON public.profiles;
CREATE POLICY "Allow users to view profiles"
ON public.profiles FOR SELECT TO authenticated
USING ((auth.uid() = id AND role <> 'applicant') OR public.is_mentor());

-- A mentor can update any non-mentor/admin profile (including promoting
-- someone TO mentor, which stays unrestricted). Only an admin may update a
-- profile that is ALREADY mentor/admin, or grant the admin role itself -
-- separation of duties so two mentors can't demote or suspend each other.
DROP POLICY IF EXISTS "Allow mentors to update profiles" ON public.profiles;
CREATE POLICY "Allow mentors to update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_mentor() AND (public.is_admin() OR role NOT IN ('mentor', 'admin')))
WITH CHECK (public.is_admin() OR role <> 'admin');

DROP POLICY IF EXISTS "Allow mentors to delete profiles" ON public.profiles;
CREATE POLICY "Allow mentors to delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_mentor() AND (public.is_admin() OR role NOT IN ('mentor', 'admin')));

-- studies (no DELETE policy - hard-delete is intentionally blocked; the
-- app issues an UPDATE to set deleted_at instead, and true destruction is
-- reserved for the controlled destruction workflow via the service role)
DROP POLICY IF EXISTS "Allow active authenticated users to view studies" ON public.studies;
CREATE POLICY "Allow active authenticated users to view studies"
ON public.studies FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_read_only() AND public.is_study_member(id));

-- Mentor/admin can additionally view soft-deleted studies - needed for the
-- retention/destruction-request workflow, which otherwise has no way to
-- even read the study it's evaluating.
DROP POLICY IF EXISTS "Allow mentors to view deleted studies" ON public.studies;
CREATE POLICY "Allow mentors to view deleted studies"
ON public.studies FOR SELECT TO authenticated
USING (deleted_at IS NOT NULL AND public.is_mentor());

DROP POLICY IF EXISTS "Allow mentors to create studies" ON public.studies;
CREATE POLICY "Allow mentors to create studies"
ON public.studies FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "Allow mentors to update studies" ON public.studies;
CREATE POLICY "Allow mentors to update studies"
ON public.studies FOR UPDATE TO authenticated
USING (public.is_mentor());

-- study_members
DROP POLICY IF EXISTS "study_members_read" ON public.study_members;
CREATE POLICY "study_members_read" ON public.study_members
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'
            AND role IN ('admin', 'mentor', 'investigator', 'site_coordinator',
                         'data_manager', 'monitor', 'auditor', 'irb_reviewer'))
);

-- Restricted to active, non-deleted target users only.
DROP POLICY IF EXISTS "study_members_write" ON public.study_members;
CREATE POLICY "study_members_write" ON public.study_members
FOR ALL TO authenticated
USING (
    public.is_mentor()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = user_id AND public.profiles.status = 'active' AND public.profiles.deleted_at IS NULL
    )
)
WITH CHECK (
    public.is_mentor()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = user_id AND public.profiles.status = 'active' AND public.profiles.deleted_at IS NULL
    )
);

-- participants (INSERT/UPDATE additionally require the study to be open
-- and not soft-deleted - enforces study lock and visibility together)
DROP POLICY IF EXISTS "Allow active authenticated users to view participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to view participants"
ON public.participants FOR SELECT TO authenticated
USING (
    public.can_read_only()
    AND public.is_study_member(study_id)
    AND EXISTS (SELECT 1 FROM public.studies WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Allow active authenticated users to insert participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to insert participants"
ON public.participants FOR INSERT TO authenticated
WITH CHECK (
    public.can_edit_data()
    AND public.is_study_member(study_id)
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL AND public.studies.lock_state = 'open'
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to update participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to update participants"
ON public.participants FOR UPDATE TO authenticated
USING (
    public.can_edit_data()
    AND public.is_study_member(study_id)
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL AND public.studies.lock_state = 'open'
    )
);

DROP POLICY IF EXISTS "Allow mentors to delete participants" ON public.participants;
CREATE POLICY "Allow mentors to delete participants"
ON public.participants FOR DELETE TO authenticated
USING (public.is_mentor());

-- measurements (same shape as participants)
DROP POLICY IF EXISTS "Allow active authenticated users to view measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to view measurements"
ON public.measurements FOR SELECT TO authenticated
USING (
    public.can_read_only()
    AND public.is_study_member(study_id)
    AND EXISTS (SELECT 1 FROM public.studies WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL)
);

DROP POLICY IF EXISTS "Allow active authenticated users to insert measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to insert measurements"
ON public.measurements FOR INSERT TO authenticated
WITH CHECK (
    public.can_edit_data()
    AND public.is_study_member(study_id)
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL AND public.studies.lock_state = 'open'
    )
);

-- Only is_valid/validity_reason may actually change in place (see
-- enforce_measurements_immutability() below) - this policy just governs who
-- may attempt an UPDATE at all.
DROP POLICY IF EXISTS "Allow active authenticated users to update measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to update measurements"
ON public.measurements FOR UPDATE TO authenticated
USING (
    public.can_edit_data()
    AND public.is_study_member(study_id)
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL AND public.studies.lock_state = 'open'
    )
);

DROP POLICY IF EXISTS "Allow mentors to delete measurements" ON public.measurements;
CREATE POLICY "Allow mentors to delete measurements"
ON public.measurements FOR DELETE TO authenticated
USING (public.is_mentor());

-- audit_log (read-only to the app; no UPDATE/DELETE policy exists at all -
-- rows are inserted directly by log_audit_event() below, bypassing RLS via
-- SECURITY DEFINER). Global (non-study) entries such as ROLE_CHANGE are
-- mentor-only; study-scoped entries require the viewer to be a member of
-- that study.
DROP POLICY IF EXISTS "audit_log_select_mentor" ON public.audit_log;
CREATE POLICY "audit_log_select_mentor"
ON public.audit_log FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'monitor', 'auditor')
          AND public.profiles.status = 'active'
    )
    AND (
        (study_id IS NULL AND public.is_mentor())
        OR (study_id IS NOT NULL AND public.is_study_member(study_id))
    )
);

-- queries
DROP POLICY IF EXISTS "queries_select" ON public.queries;
CREATE POLICY "queries_select"
ON public.queries FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "queries_insert" ON public.queries;
CREATE POLICY "queries_insert"
ON public.queries FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'data_manager', 'monitor', 'investigator')
          AND public.profiles.status = 'active'
    )
    AND public.is_study_member(study_id)
);

DROP POLICY IF EXISTS "queries_update" ON public.queries;
CREATE POLICY "queries_update"
ON public.queries FOR UPDATE TO authenticated
USING (public.can_mutate_queries() AND public.is_study_member(study_id));

-- signatures (append-only - no UPDATE/DELETE policy)
DROP POLICY IF EXISTS "signatures_select" ON public.signatures;
CREATE POLICY "signatures_select"
ON public.signatures FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "signatures_insert" ON public.signatures;
CREATE POLICY "signatures_insert"
ON public.signatures FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'investigator')
          AND public.profiles.status = 'active'
    )
    AND public.is_study_member(study_id)
);

-- consent_form_versions (protocol-level document control - reserved for
-- the PI/sponsor, distinct from recording an individual participant's
-- consent below, which any edit-capable role can do)
DROP POLICY IF EXISTS "consent_form_versions_select" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_select"
ON public.consent_form_versions FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "consent_form_versions_insert" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_insert"
ON public.consent_form_versions FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "consent_form_versions_update" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_update"
ON public.consent_form_versions FOR UPDATE TO authenticated
USING (public.is_mentor());

-- consent_records (append-only - no UPDATE policy)
DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select"
ON public.consent_records FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert"
ON public.consent_records FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

-- adverse_events
DROP POLICY IF EXISTS "adverse_events_select" ON public.adverse_events;
CREATE POLICY "adverse_events_select"
ON public.adverse_events FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "adverse_events_insert" ON public.adverse_events;
CREATE POLICY "adverse_events_insert"
ON public.adverse_events FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "adverse_events_update" ON public.adverse_events;
CREATE POLICY "adverse_events_update"
ON public.adverse_events FOR UPDATE TO authenticated
USING (public.can_edit_data() AND public.is_study_member(study_id));

-- delegations. UPDATE is shared by two different actors for two different
-- reasons (delegator revokes vs. delegate completes) - this policy only
-- decides who may attempt an update at all; enforce_delegations_lifecycle()
-- below decides exactly what they're allowed to change.
DROP POLICY IF EXISTS "delegations_select" ON public.delegations;
CREATE POLICY "delegations_select"
ON public.delegations FOR SELECT TO authenticated
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "delegations_insert" ON public.delegations;
CREATE POLICY "delegations_insert"
ON public.delegations FOR INSERT TO authenticated
WITH CHECK (public.can_manage_delegations());

DROP POLICY IF EXISTS "delegations_update" ON public.delegations;
CREATE POLICY "delegations_update"
ON public.delegations FOR UPDATE TO authenticated
USING (public.can_manage_delegations() OR delegated_to = auth.uid())
WITH CHECK (public.can_manage_delegations() OR delegated_to = auth.uid());

-- signing_tokens - users may only mint/read/consume their own tokens.
-- No DELETE policy - expired/consumed rows are cheap to keep and are useful
-- audit evidence of when re-authentication actually happened.
DROP POLICY IF EXISTS "signing_tokens_insert" ON public.signing_tokens;
CREATE POLICY "signing_tokens_insert" ON public.signing_tokens
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "signing_tokens_select" ON public.signing_tokens;
CREATE POLICY "signing_tokens_select" ON public.signing_tokens
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Restricted to consuming (setting consumed_at) a still-valid, unconsumed
-- token belonging to the caller - see consumeSigningToken() in
-- src/lib/signing-tokens.ts, which relies on this being atomic (the
-- UPDATE's own WHERE clause re-checks consumed_at/expires_at at execution
-- time, so two concurrent consume attempts can't both succeed).
DROP POLICY IF EXISTS "signing_tokens_update" ON public.signing_tokens;
CREATE POLICY "signing_tokens_update" ON public.signing_tokens
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Triggers
-- ============================================================

-- New sign-ups start as an 'applicant' with status 'wait_email_confirm' and a
-- 30-day expiry, not directly 'wait_approval' - see cleanup_expired_candidates()
-- below for what happens if nobody confirms/reviews them in time.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, status, candidate_expires_at)
    VALUES (NEW.id, NEW.email, 'applicant', 'wait_email_confirm', NOW() + INTERVAL '30 days');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- When an applicant confirms their email (email_confirmed_at flips NULL ->
-- NOT NULL), advance them from 'wait_email_confirm' (registered, not yet
-- reviewable) to 'wait_approval' (confirmed, awaiting mentor approval), and
-- reset the 30-day expiry so the mentor gets a fresh window to approve.
-- Only ever promotes a row that is still 'wait_email_confirm' -
-- active/suspended/already-wait_approval profiles are left untouched, and if
-- no matching profile exists the UPDATE simply affects zero rows (never
-- raises, so it can't block Supabase's confirmation flow).
-- SECURITY DEFINER so it can write public.profiles regardless of caller,
-- mirroring handle_new_user() above. Requires "Confirm email" to be enabled
-- in Supabase Auth settings, otherwise email_confirmed_at is set at sign-up
-- and the wait_email_confirm state is never observable.
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.profiles
           SET status = 'wait_approval',
               candidate_expires_at = NOW() + INTERVAL '30 days'
         WHERE id = NEW.id
           AND status = 'wait_email_confirm';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();

-- Fires AFTER INSERT/UPDATE/DELETE on every clinical/compliance table and
-- writes one row to audit_log per operation. auth.uid() is captured inside
-- the trigger so the actor is always the Supabase-authenticated user, never
-- something passed by the application layer (tamper-resistant).
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_action      TEXT;
    v_record_id   TEXT;
    v_old_val     JSONB;
    v_new_val     JSONB;
    v_study_id    UUID;
    v_actor_email TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Special-case a signature insert: it's a sign-off event, not a generic write.
        IF TG_TABLE_NAME = 'signatures' THEN
            v_action := 'SIGN_OFF';
        ELSE
            v_action := 'INSERT';
        END IF;
        v_old_val   := NULL;
        v_new_val   := to_jsonb(NEW);
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Special-case a few updates for readability in the audit trail.
        IF TG_TABLE_NAME = 'studies' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'SOFT_DELETE';
        ELSIF TG_TABLE_NAME = 'studies' AND OLD.lock_state = 'open' AND NEW.lock_state = 'locked' THEN
            v_action := 'LOCK';
        ELSIF TG_TABLE_NAME = 'studies' AND OLD.lock_state = 'locked' AND NEW.lock_state = 'open' THEN
            v_action := 'UNLOCK';
        ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role <> NEW.role THEN
            v_action := 'ROLE_CHANGE';
        ELSIF TG_TABLE_NAME = 'profiles' AND OLD.status <> NEW.status THEN
            v_action := 'STATUS_CHANGE';
        ELSIF TG_TABLE_NAME = 'participants' AND OLD.status <> NEW.status THEN
            v_action := 'STATUS_CHANGE';
        ELSE
            v_action := 'UPDATE';
        END IF;
        v_old_val   := to_jsonb(OLD);
        v_new_val   := to_jsonb(NEW);
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'DELETE' THEN
        v_action    := 'DELETE';
        v_old_val   := to_jsonb(OLD);
        v_new_val   := NULL;
        v_record_id := OLD.id::TEXT;
    END IF;

    BEGIN
        IF TG_TABLE_NAME = 'studies' THEN
            -- studies has no study_id column - it IS the study, keyed by id.
            v_study_id := COALESCE((v_new_val->>'id')::UUID, (v_old_val->>'id')::UUID);
        ELSIF TG_OP <> 'DELETE' THEN
            v_study_id := (v_new_val->>'study_id')::UUID;
        ELSE
            v_study_id := (v_old_val->>'study_id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_study_id := NULL;
    END;

    BEGIN
        SELECT email INTO v_actor_email FROM public.profiles WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor_email := 'unknown';
    END;

    INSERT INTO public.audit_log (
        occurred_at, actor_id, actor_email, table_name, record_id, action, old_value, new_value, study_id
    ) VALUES (
        NOW() AT TIME ZONE 'UTC', auth.uid(), COALESCE(v_actor_email, 'system'),
        TG_TABLE_NAME, v_record_id, v_action, v_old_val, v_new_val, v_study_id
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_measurements ON public.measurements;
CREATE TRIGGER audit_measurements
    AFTER INSERT OR UPDATE OR DELETE ON public.measurements
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_participants ON public.participants;
CREATE TRIGGER audit_participants
    AFTER INSERT OR UPDATE OR DELETE ON public.participants
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_studies ON public.studies;
CREATE TRIGGER audit_studies
    AFTER INSERT OR UPDATE OR DELETE ON public.studies
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_queries ON public.queries;
CREATE TRIGGER audit_queries
    AFTER INSERT OR UPDATE ON public.queries
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_signatures ON public.signatures;
CREATE TRIGGER audit_signatures
    AFTER INSERT ON public.signatures
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_consent_form_versions ON public.consent_form_versions;
CREATE TRIGGER audit_consent_form_versions
    AFTER INSERT OR UPDATE ON public.consent_form_versions
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_consent_records ON public.consent_records;
CREATE TRIGGER audit_consent_records
    AFTER INSERT ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_adverse_events ON public.adverse_events;
CREATE TRIGGER audit_adverse_events
    AFTER INSERT OR UPDATE ON public.adverse_events
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_delegations ON public.delegations;
CREATE TRIGGER audit_delegations
    AFTER INSERT OR UPDATE ON public.delegations
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- study_members has its own audit trigger (not log_audit_event()) because
-- it has no single "id" column - SECURITY DEFINER is required since
-- audit_log's only policy is SELECT, so a SECURITY INVOKER trigger running
-- as `authenticated` would have no INSERT grant and the whole grant/revoke
-- transaction would roll back.
CREATE OR REPLACE FUNCTION public.audit_study_members()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, new_value, occurred_at)
        VALUES (NEW.study_id, 'study_members', NEW.user_id::TEXT, 'INSERT', auth.uid(),
                jsonb_build_object('user_id', NEW.user_id, 'study_role', NEW.study_role), NOW());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, old_value, occurred_at)
        VALUES (OLD.study_id, 'study_members', OLD.user_id::TEXT, 'DELETE', auth.uid(),
                jsonb_build_object('user_id', OLD.user_id, 'study_role', OLD.study_role), NOW());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS study_members_audit ON public.study_members;
CREATE TRIGGER study_members_audit
    AFTER INSERT OR DELETE ON public.study_members
    FOR EACH ROW EXECUTE FUNCTION public.audit_study_members();

-- Schema comments have long asserted measurements/participants are "never
-- edited in place," but the UPDATE RLS policies above are column-blind -
-- these BEFORE UPDATE triggers make the restriction a real DB constraint:
-- only the columns the application actually uses for in-place updates may
-- change (see repositories/measurements.ts::updateMeasurementValidity and
-- repositories/participants.ts::updateParticipantStatus).
CREATE OR REPLACE FUNCTION public.enforce_measurements_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.participant_id IS DISTINCT FROM OLD.participant_id
       OR NEW.study_id IS DISTINCT FROM OLD.study_id
       OR NEW.goniometer IS DISTINCT FROM OLD.goniometer
       OR NEW.ai_model IS DISTINCT FROM OLD.ai_model
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.timestamp IS DISTINCT FROM OLD.timestamp
       OR NEW.test_date IS DISTINCT FROM OLD.test_date
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.capture_method IS DISTINCT FROM OLD.capture_method
    THEN
        RAISE EXCEPTION 'measurements is immutable: only is_valid and validity_reason may be updated (attempted change on record %)', OLD.id
            USING ERRCODE = 'raise_exception';
    END IF;
    -- Invalidation is one-way (see FEATURES.md/MENTOR.md/INVESTIGATOR.md) -
    -- once a measurement is flagged invalid there is no "mark valid again"
    -- path, so reject is_valid going false -> true even via a direct API call.
    IF OLD.is_valid = false AND NEW.is_valid = true THEN
        RAISE EXCEPTION 'measurements is_valid cannot be reversed once set to false (record %)', OLD.id
            USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_measurements_immutability ON public.measurements;
CREATE TRIGGER enforce_measurements_immutability
    BEFORE UPDATE ON public.measurements
    FOR EACH ROW EXECUTE FUNCTION public.enforce_measurements_immutability();

CREATE OR REPLACE FUNCTION public.enforce_participants_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.study_id IS DISTINCT FROM OLD.study_id
       OR NEW.age IS DISTINCT FROM OLD.age
       OR NEW.gender IS DISTINCT FROM OLD.gender
       OR NEW.health_status IS DISTINCT FROM OLD.health_status
       OR NEW.enrollment_date IS DISTINCT FROM OLD.enrollment_date
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
    THEN
        RAISE EXCEPTION 'participants is immutable: only status and status_reason may be updated (attempted change on record %)', OLD.id
            USING ERRCODE = 'raise_exception';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_participants_immutability ON public.participants;
CREATE TRIGGER enforce_participants_immutability
    BEFORE UPDATE ON public.participants
    FOR EACH ROW EXECUTE FUNCTION public.enforce_participants_immutability();

-- Delegation completion (delegate-initiated "Mark Complete") and revocation
-- (delegator-initiated) are permanent, mutually exclusive terminal states -
-- and a delegation past its own effective_to date is equally terminal even
-- though nothing is ever written when that happens. "Expired" is just a
-- computed display label elsewhere in the app, but that only holds up if
-- the backend actually treats an expired row as closed too - otherwise a
-- direct API call could revoke or complete something the UI already shows
-- as done. This trigger is what makes that real instead of cosmetic: once
-- closed for any of the three reasons, the row is fully immutable; while
-- still open, only the exact column set each actor's path is allowed to
-- touch may change, with attribution (completed_by/revoked_by) forced to
-- auth.uid() so it can never be spoofed by the client.
CREATE OR REPLACE FUNCTION public.enforce_delegations_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    was_closed BOOLEAN;
BEGIN
    was_closed := OLD.revoked_at IS NOT NULL
               OR OLD.completed_at IS NOT NULL
               OR (OLD.effective_to IS NOT NULL AND OLD.effective_to < CURRENT_DATE);

    IF was_closed THEN
        RAISE EXCEPTION 'This delegation is already closed (completed, revoked, or past its effective-to date) and cannot be changed.'
            USING ERRCODE = 'raise_exception';
    END IF;

    -- Path 1: the delegate marks their own delegation complete.
    IF NEW.completed_at IS NOT NULL AND OLD.delegated_to = auth.uid() THEN
        IF NEW.completed_by IS DISTINCT FROM auth.uid()
           OR NEW.study_id IS DISTINCT FROM OLD.study_id
           OR NEW.delegated_to IS DISTINCT FROM OLD.delegated_to
           OR NEW.task_description IS DISTINCT FROM OLD.task_description
           OR NEW.delegated_by IS DISTINCT FROM OLD.delegated_by
           OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
           OR NEW.effective_to IS DISTINCT FROM OLD.effective_to
           OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
           OR NEW.revoked_by IS DISTINCT FROM OLD.revoked_by
        THEN
            RAISE EXCEPTION 'Marking a delegation complete may only set completed_at/completed_by to your own user id.'
                USING ERRCODE = 'raise_exception';
        END IF;
        RETURN NEW;
    END IF;

    -- Path 2: a delegation manager (admin/mentor/investigator) revokes it.
    IF NEW.revoked_at IS NOT NULL AND public.can_manage_delegations() THEN
        IF NEW.revoked_by IS DISTINCT FROM auth.uid()
           OR NEW.study_id IS DISTINCT FROM OLD.study_id
           OR NEW.delegated_to IS DISTINCT FROM OLD.delegated_to
           OR NEW.task_description IS DISTINCT FROM OLD.task_description
           OR NEW.delegated_by IS DISTINCT FROM OLD.delegated_by
           OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
           OR NEW.effective_to IS DISTINCT FROM OLD.effective_to
           OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
           OR NEW.completed_by IS DISTINCT FROM OLD.completed_by
        THEN
            RAISE EXCEPTION 'Revoking a delegation may only set revoked_at/revoked_by to your own user id.'
                USING ERRCODE = 'raise_exception';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Unrecognized or unauthorized delegation update.'
        USING ERRCODE = 'raise_exception';
END;
$$;

DROP TRIGGER IF EXISTS enforce_delegations_lifecycle ON public.delegations;
CREATE TRIGGER enforce_delegations_lifecycle
    BEFORE UPDATE ON public.delegations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_delegations_lifecycle();

-- ============================================================
-- RPCs
-- ============================================================

-- Hard-deletes an applicant (never-approved account) from auth.users
-- (cascades to profiles). Used by both the manual "reject" action in User
-- Registry and, indirectly, by cleanup_expired_candidates() below. Checked
-- against role = 'applicant' rather than a specific status, since the
-- profiles_applicant_status_exclusive constraint guarantees that covers both
-- 'wait_email_confirm' and 'wait_approval' - any applicant is by definition
-- never-approved, and an approved account is never 'applicant' again.
CREATE OR REPLACE FUNCTION public.delete_candidate_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'applicant') THEN
        DELETE FROM auth.users WHERE id = p_user_id;
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;

-- Scheduled daily via pg_cron below; POST /api/admin/cleanup-candidates
-- remains available for an on-demand manual trigger. Removes any applicant
-- (unconfirmed or confirmed-but-unapproved) whose 30-day window has lapsed -
-- never-approved accounts are hard-deleted; ever-approved accounts are never
-- 'applicant' and so are never touched here (see profiles DELETE/UPDATE RLS
-- for how an approved account is soft-deleted instead).
CREATE OR REPLACE FUNCTION public.cleanup_expired_candidates()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth.users
    WHERE id IN (
        SELECT id FROM public.profiles WHERE role = 'applicant' AND candidate_expires_at < NOW()
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Records a DESTRUCTION_REQUEST audit entry directly. SECURITY DEFINER lets
-- this insert bypass RLS the same way log_audit_event() does, without
-- touching any other column on the study.
CREATE OR REPLACE FUNCTION public.record_destruction_request(p_study_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, reason, occurred_at)
    VALUES (p_study_id, 'studies', p_study_id::TEXT, 'DESTRUCTION_REQUEST', auth.uid(), p_reason, NOW());
END;
$$;

-- Atomic per-study participant id allocation. INSERT ... ON CONFLICT DO
-- UPDATE ... RETURNING is a well-known atomic-increment pattern in Postgres
-- - the row lock taken by the conflicting UPDATE serializes concurrent
-- callers, so two simultaneous enrollments always get distinct ids (safe
-- under Vercel's many-concurrent-lambdas model, unlike computing max+1 in
-- application code). Starts at 1001 to match the existing numbering
-- convention.
CREATE OR REPLACE FUNCTION public.next_participant_id(p_study_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_next INTEGER;
BEGIN
    INSERT INTO public.participant_id_counters (study_id, last_id)
    VALUES (p_study_id, 1001)
    ON CONFLICT (study_id) DO UPDATE
        SET last_id = public.participant_id_counters.last_id + 1
    RETURNING last_id INTO v_next;

    RETURN 'P-' || v_next;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================

-- Every clinical table is filtered by study_id on essentially every query,
-- and is_study_member() (used in most RLS policies above) does a
-- study_members lookup on every row access.
CREATE INDEX IF NOT EXISTS idx_participants_study_id ON public.participants(study_id);
CREATE INDEX IF NOT EXISTS idx_measurements_study_id ON public.measurements(study_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_study_id ON public.audit_log(study_id);
CREATE INDEX IF NOT EXISTS idx_queries_study_id ON public.queries(study_id);
CREATE INDEX IF NOT EXISTS idx_signatures_study_id ON public.signatures(study_id);
CREATE INDEX IF NOT EXISTS idx_adverse_events_study_id ON public.adverse_events(study_id);
CREATE INDEX IF NOT EXISTS idx_delegations_study_id ON public.delegations(study_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_study_id ON public.consent_records(study_id);
CREATE INDEX IF NOT EXISTS idx_consent_form_versions_study_id ON public.consent_form_versions(study_id);

-- Composite: every is_study_member(study_id) call filters on both columns.
CREATE INDEX IF NOT EXISTS idx_study_members_study_user ON public.study_members(study_id, user_id);

-- audit_log is append-only and unbounded; GET /api/audit-log always orders
-- by occurred_at DESC (optionally filtered by study_id) with LIMIT 500.
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON public.audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_study_occurred ON public.audit_log(study_id, occurred_at DESC);

-- ============================================================
-- Scheduled jobs
-- ============================================================

-- Requires the pg_cron extension to be enabled for this project (Supabase
-- dashboard: Database > Extensions > pg_cron, or
-- `CREATE EXTENSION IF NOT EXISTS pg_cron;` if you have the privileges to
-- run it directly). Guarded so the rest of this script still runs cleanly
-- if pg_cron isn't enabled yet - re-run it after enabling the extension to
-- pick up the schedule.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-expired-candidates';
        PERFORM cron.schedule(
            'cleanup-expired-candidates',
            '0 3 * * *', -- daily at 03:00 UTC
            $cron$SELECT public.cleanup_expired_candidates();$cron$
        );
    ELSE
        RAISE NOTICE 'pg_cron extension is not enabled - skipping cleanup-expired-candidates schedule. Enable pg_cron and re-run this script to activate it.';
    END IF;
END;
$$;
