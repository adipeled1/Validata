-- 1. Create Profiles table in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mentor', 'team_member')) DEFAULT 'team_member',
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions to prevent policy recursion
-- This function runs with SECURITY DEFINER privileges to bypass RLS checks on profiles table
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'mentor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies to prevent duplicates/conflicts
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow mentors to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow mentors to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow mentors to delete profiles" ON public.profiles;

-- Create RLS Policies for profiles
-- Policy to allow any authenticated user to view their own profile, or mentors to view all profiles
CREATE POLICY "Allow users to view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR public.is_mentor());

-- Policy to allow mentors to update any profile (assign roles/status)
CREATE POLICY "Allow mentors to update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (public.is_mentor());

-- Policy to allow mentors to delete profiles
CREATE POLICY "Allow mentors to delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated 
USING (public.is_mentor());


-- 3. Automatic Profile Creation Trigger on Auth Sign Up
-- This trigger automatically inserts a row in the public.profiles table whenever a new user registers.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, status)
    VALUES (new.id, new.email, 'team_member', 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution definition
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add date-related columns if they don't exist
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS enrollment_date DATE;

ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS test_date DATE;

-- 5. Enable RLS on other tables (if not already enabled) and add Policies
-- Enable RLS on participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow active authenticated users to view participants" ON public.participants;
DROP POLICY IF EXISTS "Allow active authenticated users to insert participants" ON public.participants;
DROP POLICY IF EXISTS "Allow active authenticated users to update participants" ON public.participants;

CREATE POLICY "Allow active authenticated users to view participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

CREATE POLICY "Allow active authenticated users to insert participants"
ON public.participants
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

CREATE POLICY "Allow active authenticated users to update participants"
ON public.participants
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

-- Enable RLS on measurements
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow active authenticated users to view measurements" ON public.measurements;
DROP POLICY IF EXISTS "Allow active authenticated users to insert measurements" ON public.measurements;

CREATE POLICY "Allow active authenticated users to view measurements"
ON public.measurements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

CREATE POLICY "Allow active authenticated users to insert measurements"
ON public.measurements
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

-- 6. Data migration: update health_status check constraint and rename 'Sick' to 'Ankle Injured'
ALTER TABLE public.participants
DROP CONSTRAINT IF EXISTS participants_health_status_check;

UPDATE public.participants
SET health_status = 'Ankle Injured'
WHERE health_status = 'Sick';

ALTER TABLE public.participants
ADD CONSTRAINT participants_health_status_check
CHECK (health_status IN ('Healthy', 'Ankle Injured'));

-- 7. Allow toggling is_valid on measurements - the app never edits
-- goniometer/ai_model values in place once written, only this flag.
DROP POLICY IF EXISTS "Allow active authenticated users to update measurements" ON public.measurements;

CREATE POLICY "Allow active authenticated users to update measurements"
ON public.measurements
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

-- 8. Studies table. Every study has its own recruitment goal; participants
-- and measurements are tagged with a study_id so mentors/team members can
-- switch between studies and only ever see one study's data at a time.
-- There is no per-member access control yet - any active user can see and
-- switch between all studies.
CREATE TABLE IF NOT EXISTS public.studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    recruitment_goal INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.studies (name, recruitment_goal)
VALUES ('braude''s_research_1', 50), ('braude''s_research_2', 30)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow active authenticated users to view studies" ON public.studies;
DROP POLICY IF EXISTS "Allow mentors to create studies" ON public.studies;
DROP POLICY IF EXISTS "Allow mentors to update studies" ON public.studies;

CREATE POLICY "Allow active authenticated users to view studies"
ON public.studies
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

CREATE POLICY "Allow mentors to create studies"
ON public.studies
FOR INSERT
TO authenticated
WITH CHECK (public.is_mentor());

CREATE POLICY "Allow mentors to update studies"
ON public.studies
FOR UPDATE
TO authenticated
USING (public.is_mentor());

-- 9. Tag existing tables with study_id, backfilling pre-existing rows into
-- braude's_research_1 so nothing currently in the database becomes orphaned.
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id);
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id);

UPDATE public.participants
SET study_id = (SELECT id FROM public.studies WHERE name = 'braude''s_research_1')
WHERE study_id IS NULL;

UPDATE public.measurements
SET study_id = (SELECT id FROM public.studies WHERE name = 'braude''s_research_1')
WHERE study_id IS NULL;

ALTER TABLE public.participants ALTER COLUMN study_id SET NOT NULL;
ALTER TABLE public.measurements ALTER COLUMN study_id SET NOT NULL;

-- participants.id was previously the sole primary key, so the same
-- human-readable id (e.g. "P-1001") could not exist in two different studies.
-- Replace it with a composite primary key of (id, study_id), so each study
-- gets its own independent P-1001, P-1002... sequence.
--
-- measurements.participant_id has a foreign key into participants' current
-- PK, which blocks dropping it. Drop every FK that references participants
-- (discovered dynamically, in case the name differs from what's expected)
-- before swapping the PK, then recreate the measurements FK below as a
-- composite key against (id, study_id) - a participant id is now only
-- unique within a study, so the FK must include study_id too.
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT con.conname, rel.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE con.contype = 'f'
      AND frel.relname = 'participants'
      AND frel.relnamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk.table_name, fk.conname);
  END LOOP;
END $$;

DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT tc.constraint_name INTO pk_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'participants'
    AND tc.constraint_type = 'PRIMARY KEY';

  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.participants DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

ALTER TABLE public.participants ADD PRIMARY KEY (id, study_id);

-- Recreate the measurements -> participants link as a composite FK. This
-- only succeeds if every measurement's (participant_id, study_id) pair
-- matches an existing participant row, which holds here because both tables
-- were just backfilled into the same single study above.
ALTER TABLE public.measurements
ADD CONSTRAINT measurements_participant_study_fkey
FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id);

-- 10. Validity flag for measurements. Once a measurement's value is written
-- it is never edited in place - instead it can be flagged invalid (one-way,
-- like Drop) and is excluded from the statistics/Bland-Altman calculations.
-- Defaults to valid for every row, including bulk Excel/CSV/JSON imports.
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS is_valid BOOLEAN NOT NULL DEFAULT true;

-- 11. Deleting a study (mentors only, via the Study Management screen)
-- permanently deletes all of its participants and measurements too. The API
-- route deletes the child rows explicitly before deleting the study row, so
-- these DELETE policies are required on all three tables.
DROP POLICY IF EXISTS "Allow mentors to delete studies" ON public.studies;
DROP POLICY IF EXISTS "Allow mentors to delete participants" ON public.participants;
DROP POLICY IF EXISTS "Allow mentors to delete measurements" ON public.measurements;

CREATE POLICY "Allow mentors to delete studies"
ON public.studies
FOR DELETE
TO authenticated
USING (public.is_mentor());

CREATE POLICY "Allow mentors to delete participants"
ON public.participants
FOR DELETE
TO authenticated
USING (public.is_mentor());

CREATE POLICY "Allow mentors to delete measurements"
ON public.measurements
FOR DELETE
TO authenticated
USING (public.is_mentor());

-- 12. The pre-existing participants_status_check constraint only allowed
-- 'Active'/'Dropped' - 'Completed' is now a real status (manual, reversible
-- toggle), so it must be added to the allowed list.
ALTER TABLE public.participants
DROP CONSTRAINT IF EXISTS participants_status_check;

ALTER TABLE public.participants
ADD CONSTRAINT participants_status_check
CHECK (status IN ('Active', 'Completed', 'Dropped'));

-- ============================================================
-- ICH E6(R3) COMPLIANCE ADDITIONS
-- ============================================================

-- 13. Attribution and correction-reason columns (INT-02, CAP-02, AUDIT-02, COR-01)
--     Every clinical row must record who created it so data is
--     attributable — the "A" in ALCOA+.
ALTER TABLE public.measurements
    ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS capture_method  TEXT CHECK (capture_method IN ('manual_entry', 'file_import')),
    ADD COLUMN IF NOT EXISTS validity_reason TEXT; -- reason text when is_valid is changed

ALTER TABLE public.participants
    ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS status_reason TEXT; -- reason text when status changes (e.g. drop reason)

ALTER TABLE public.studies
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 14. Soft-delete and retention controls for studies (RET-01, RET-02, RET-03)
--     Hard-deleting a study permanently destroys trial data. Replace with
--     a soft-delete flag so data is never truly gone without an explicit
--     controlled destruction workflow. retention_hold blocks any destruction
--     while a sponsor-issued hold is active.
ALTER TABLE public.studies
    ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by      UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS retention_hold  BOOLEAN NOT NULL DEFAULT FALSE;

-- Hide soft-deleted studies from every existing SELECT policy by adding a
-- deleted_at IS NULL predicate. Drop and recreate each affected policy.
DROP POLICY IF EXISTS "Allow active authenticated users to view studies" ON public.studies;
CREATE POLICY "Allow active authenticated users to view studies"
ON public.studies
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
);

DROP POLICY IF EXISTS "Allow mentors to delete studies" ON public.studies;
-- Prevent hard-deletes on studies at the RLS level. The application now
-- issues an UPDATE to set deleted_at instead; hard-DELETE is reserved for
-- the controlled destruction workflow executed via the service role.
-- (No new DELETE policy is created here intentionally.)

-- Cascade the soft-delete visibility to participant and measurement queries
-- so switching to a deleted study never surfaces its data.
DROP POLICY IF EXISTS "Allow active authenticated users to view participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to view participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to view measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to view measurements"
ON public.measurements
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid() AND public.profiles.status = 'active'
    )
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL
    )
);

-- 15. Audit log table (AUDIT-01 through AUDIT-08)
--     Immutable append-only log. Application users may only INSERT (via the
--     trigger functions below). No UPDATE or DELETE policies are created.
--     This table itself is never truncated by application code.
CREATE TABLE IF NOT EXISTS public.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    actor_id    UUID        REFERENCES auth.users(id),
    actor_email TEXT        NOT NULL DEFAULT 'system',
    table_name  TEXT        NOT NULL,
    record_id   TEXT        NOT NULL,
    action      TEXT        NOT NULL CHECK (action IN (
                    'INSERT', 'UPDATE', 'DELETE',
                    'LOGIN', 'LOGOUT',
                    'ROLE_CHANGE', 'STATUS_CHANGE',
                    'LOCK', 'UNLOCK',
                    'SIGN_OFF',
                    'SOFT_DELETE', 'DESTRUCTION_REQUEST', 'DESTRUCTION_APPROVED'
                )),
    old_value   JSONB,
    new_value   JSONB,
    reason      TEXT,
    study_id    UUID        REFERENCES public.studies(id)
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only mentors (and monitors/auditors once role model is expanded) can read.
-- Nobody can UPDATE or DELETE via the application — triggers insert directly.
DROP POLICY IF EXISTS "audit_log_select_mentor" ON public.audit_log;
CREATE POLICY "audit_log_select_mentor"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_mentor());

-- 16. Audit trigger function (AUDIT-01 through AUDIT-08)
--     Fires AFTER INSERT, UPDATE, DELETE on every clinical table and writes
--     one row to audit_log per operation. auth.uid() is captured inside the
--     trigger so the actor is always the Supabase-authenticated user, never
--     something passed by the application layer (tamper-resistant).
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_action     TEXT;
    v_record_id  TEXT;
    v_old_val    JSONB;
    v_new_val    JSONB;
    v_study_id   UUID;
    v_actor_email TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action    := 'INSERT';
        v_old_val   := NULL;
        v_new_val   := to_jsonb(NEW);
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Treat soft-delete updates specially for readability
        IF TG_TABLE_NAME = 'studies' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'SOFT_DELETE';
        ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role <> NEW.role THEN
            v_action := 'ROLE_CHANGE';
        ELSIF TG_TABLE_NAME = 'profiles' AND OLD.status <> NEW.status THEN
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

    -- Capture study_id when available on the row
    BEGIN
        IF TG_OP <> 'DELETE' THEN
            v_study_id := (v_new_val->>'study_id')::UUID;
        ELSE
            v_study_id := (v_old_val->>'study_id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_study_id := NULL;
    END;

    -- Look up actor email from profiles (best-effort; NULL if not found)
    BEGIN
        SELECT email INTO v_actor_email
        FROM public.profiles
        WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor_email := 'unknown';
    END;

    INSERT INTO public.audit_log (
        occurred_at, actor_id, actor_email,
        table_name, record_id, action,
        old_value, new_value, study_id
    ) VALUES (
        NOW() AT TIME ZONE 'UTC',
        auth.uid(),
        COALESCE(v_actor_email, 'system'),
        TG_TABLE_NAME,
        v_record_id,
        v_action,
        v_old_val,
        v_new_val,
        v_study_id
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to every clinical table
DROP TRIGGER IF EXISTS audit_measurements  ON public.measurements;
DROP TRIGGER IF EXISTS audit_participants  ON public.participants;
DROP TRIGGER IF EXISTS audit_studies       ON public.studies;
DROP TRIGGER IF EXISTS audit_profiles      ON public.profiles;

CREATE TRIGGER audit_measurements
    AFTER INSERT OR UPDATE OR DELETE ON public.measurements
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_participants
    AFTER INSERT OR UPDATE OR DELETE ON public.participants
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_studies
    AFTER INSERT OR UPDATE OR DELETE ON public.studies
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 17. Expanded role model (AUTH-02, ACC-01, ACC-02)
-- ============================================================
-- Expand the profiles.role CHECK constraint from 2 roles to 9.
-- New roles align with ICH E6(R3) section 5 stakeholder definitions:
--   sponsor_admin   — same authority as legacy 'mentor' (sponsor representative)
--   investigator    — PI / sub-investigator; can enter and correct data
--   site_coordinator— CRC; can enter data
--   data_manager    — DM; can enter, correct, and flag data; cannot approve
--   monitor         — CRA; read-only data access + query rights
--   auditor         — GCP auditor; read-only
--   irb_reviewer    — Ethics committee member; read-only
--   team_member     — legacy placeholder, assigned before a real role is granted
--   mentor          — legacy admin alias (kept for backwards compatibility)

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
        'mentor', 'team_member',
        'sponsor_admin', 'investigator', 'site_coordinator',
        'data_manager', 'monitor', 'auditor', 'irb_reviewer'
    ));

-- Add change_reason to profiles so audit triggers can capture WHY a role/status changed.
-- The trigger stores to_jsonb(NEW) which includes this column in new_value.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Update is_mentor() to include sponsor_admin
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('mentor', 'sponsor_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New helper: true for roles that may insert/update clinical data
CREATE OR REPLACE FUNCTION public.can_edit_data()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN (
              'mentor', 'sponsor_admin',
              'investigator', 'site_coordinator', 'data_manager'
          )
          AND public.profiles.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New helper: true for any operational role (all except bare team_member)
CREATE OR REPLACE FUNCTION public.can_read_only()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN (
              'mentor', 'sponsor_admin',
              'investigator', 'site_coordinator', 'data_manager',
              'monitor', 'auditor', 'irb_reviewer'
          )
          AND public.profiles.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update data-access RLS policies to use the new helpers.
-- SELECT: any operational role (read-only users included).
-- INSERT/UPDATE on measurements and participants: edit roles only.

-- Studies
DROP POLICY IF EXISTS "Allow active authenticated users to view studies" ON public.studies;
CREATE POLICY "Allow active authenticated users to view studies"
ON public.studies
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.can_read_only());

-- Participants
DROP POLICY IF EXISTS "Allow active authenticated users to view participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to view participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    public.can_read_only()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to insert participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to insert participants"
ON public.participants
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_data());

DROP POLICY IF EXISTS "Allow active authenticated users to update participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to update participants"
ON public.participants
FOR UPDATE
TO authenticated
USING (public.can_edit_data());

-- Measurements
DROP POLICY IF EXISTS "Allow active authenticated users to view measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to view measurements"
ON public.measurements
FOR SELECT
TO authenticated
USING (
    public.can_read_only()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id AND public.studies.deleted_at IS NULL
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to insert measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to insert measurements"
ON public.measurements
FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_data());

DROP POLICY IF EXISTS "Allow active authenticated users to update measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to update measurements"
ON public.measurements
FOR UPDATE
TO authenticated
USING (public.can_edit_data());

-- Audit log: visible to mentor, sponsor_admin, monitor, and auditor
DROP POLICY IF EXISTS "audit_log_select_mentor" ON public.audit_log;
CREATE POLICY "audit_log_select_mentor"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('mentor', 'sponsor_admin', 'monitor', 'auditor')
          AND public.profiles.status = 'active'
    )
);

-- ============================================================
-- 18. Study lock state (INT-01, INT-03)
-- ============================================================
-- Locks a study after database lock so no new data can be entered.
-- A locked study is read-only for data_manager / investigator / site_coordinator;
-- only sponsor_admin / mentor can lock and unlock.
ALTER TABLE public.studies
    ADD COLUMN IF NOT EXISTS lock_state   TEXT    NOT NULL DEFAULT 'open'
        CHECK (lock_state IN ('open', 'locked')),
    ADD COLUMN IF NOT EXISTS locked_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_by    UUID    REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS lock_reason  TEXT;

-- Enforce lock: block INSERT/UPDATE on participants while study is locked
DROP POLICY IF EXISTS "Allow active authenticated users to insert participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to insert participants"
ON public.participants
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_edit_data()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id
          AND public.studies.deleted_at IS NULL
          AND public.studies.lock_state = 'open'
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to update participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to update participants"
ON public.participants
FOR UPDATE
TO authenticated
USING (
    public.can_edit_data()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id
          AND public.studies.deleted_at IS NULL
          AND public.studies.lock_state = 'open'
    )
);

-- Enforce lock: block INSERT/UPDATE on measurements while study is locked
DROP POLICY IF EXISTS "Allow active authenticated users to insert measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to insert measurements"
ON public.measurements
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_edit_data()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id
          AND public.studies.deleted_at IS NULL
          AND public.studies.lock_state = 'open'
    )
);

DROP POLICY IF EXISTS "Allow active authenticated users to update measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to update measurements"
ON public.measurements
FOR UPDATE
TO authenticated
USING (
    public.can_edit_data()
    AND EXISTS (
        SELECT 1 FROM public.studies
        WHERE public.studies.id = study_id
          AND public.studies.deleted_at IS NULL
          AND public.studies.lock_state = 'open'
    )
);

-- ============================================================
-- 19. Query management table (CAP-04, COR-01, COR-02)
-- ============================================================
-- Data queries raised by monitors/DMs against specific field values.
-- Full lifecycle: open → answered → resolved → closed.
CREATE TABLE IF NOT EXISTS public.queries (
    id          BIGSERIAL PRIMARY KEY,
    study_id    UUID        NOT NULL REFERENCES public.studies(id),
    record_table TEXT       NOT NULL,   -- 'measurements' or 'participants'
    record_id   TEXT        NOT NULL,
    field_name  TEXT        NOT NULL,
    severity    TEXT        NOT NULL DEFAULT 'minor'
                    CHECK (severity IN ('minor', 'major', 'critical')),
    status      TEXT        NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'answered', 'resolved', 'closed')),
    raised_by   UUID        NOT NULL REFERENCES auth.users(id),
    raised_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    query_text  TEXT        NOT NULL,
    answered_by UUID        REFERENCES auth.users(id),
    answered_at TIMESTAMPTZ,
    answer_text TEXT,
    resolved_by UUID        REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    closed_by   UUID        REFERENCES auth.users(id),
    closed_at   TIMESTAMPTZ
);

ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Data editors and monitors can view queries for studies they have access to
DROP POLICY IF EXISTS "queries_select" ON public.queries;
CREATE POLICY "queries_select"
ON public.queries
FOR SELECT
TO authenticated
USING (public.can_read_only());

-- Data managers and monitors can raise queries
DROP POLICY IF EXISTS "queries_insert" ON public.queries;
CREATE POLICY "queries_insert"
ON public.queries
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('mentor', 'sponsor_admin', 'data_manager', 'monitor', 'investigator')
          AND public.profiles.status = 'active'
    )
);

-- Data editors and monitors can update queries (answer / resolve / close)
DROP POLICY IF EXISTS "queries_update" ON public.queries;
CREATE POLICY "queries_update"
ON public.queries
FOR UPDATE
TO authenticated
USING (public.can_read_only());

-- Query changes are logged by the audit trigger
DROP TRIGGER IF EXISTS audit_queries ON public.queries;
CREATE TRIGGER audit_queries
    AFTER INSERT OR UPDATE ON public.queries
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 20. Electronic signatures table (SIG-01, SIG-02, SIG-03)
-- ============================================================
-- Records investigator / sponsor sign-off on study data milestones.
-- Signatures are append-only; no UPDATE or DELETE policies.
CREATE TABLE IF NOT EXISTS public.signatures (
    id           BIGSERIAL   PRIMARY KEY,
    study_id     UUID        NOT NULL REFERENCES public.studies(id),
    signer_id    UUID        NOT NULL REFERENCES auth.users(id),
    signer_email TEXT        NOT NULL,
    record_type  TEXT        NOT NULL,   -- 'study', 'participant', 'measurement', etc.
    record_id    TEXT        NOT NULL,
    milestone    TEXT        NOT NULL,   -- e.g. 'data_lock', 'final_report', 'interim_analysis'
    meaning      TEXT        NOT NULL,   -- legal meaning text displayed at time of signing
    signed_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Investigators, sponsor admins, and mentors can read signatures for their studies
DROP POLICY IF EXISTS "signatures_select" ON public.signatures;
CREATE POLICY "signatures_select"
ON public.signatures
FOR SELECT
TO authenticated
USING (public.can_read_only());

-- Only investigators and mentor-level roles can sign (insert)
DROP POLICY IF EXISTS "signatures_insert" ON public.signatures;
CREATE POLICY "signatures_insert"
ON public.signatures
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('mentor', 'sponsor_admin', 'investigator')
          AND public.profiles.status = 'active'
    )
);

-- Signature events are logged by the audit trigger
DROP TRIGGER IF EXISTS audit_signatures ON public.signatures;
CREATE TRIGGER audit_signatures
    AFTER INSERT ON public.signatures
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 21. eConsent — consent form versions and consent records (CONSENT-01 to CONSENT-04)
-- ============================================================
-- Replaces the raw boolean `consent` field on participants with a full
-- lifecycle: IRB-approved form version → participant consent event.

-- 21a. Versioned consent forms (IRB-approved)
CREATE TABLE IF NOT EXISTS public.consent_form_versions (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    version         TEXT        NOT NULL,       -- e.g. '1.0', '2.1'
    irb_approved_at TIMESTAMPTZ,               -- NULL = pending IRB approval
    activated_at    TIMESTAMPTZ,               -- NULL = not yet active
    content_hash    TEXT,                      -- SHA-256 of the consent form PDF
    created_by      UUID        REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    UNIQUE (study_id, version)
);

ALTER TABLE public.consent_form_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_form_versions_select" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_select"
ON public.consent_form_versions FOR SELECT TO authenticated
USING (public.can_read_only());

DROP POLICY IF EXISTS "consent_form_versions_insert" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_insert"
ON public.consent_form_versions FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "consent_form_versions_update" ON public.consent_form_versions;
CREATE POLICY "consent_form_versions_update"
ON public.consent_form_versions FOR UPDATE TO authenticated
USING (public.is_mentor());

DROP TRIGGER IF EXISTS audit_consent_form_versions ON public.consent_form_versions;
CREATE TRIGGER audit_consent_form_versions
    AFTER INSERT OR UPDATE ON public.consent_form_versions
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 21b. Individual consent events per participant per form version
CREATE TABLE IF NOT EXISTS public.consent_records (
    id                 BIGSERIAL   PRIMARY KEY,
    participant_id     TEXT        NOT NULL,
    study_id           UUID        NOT NULL,
    form_version_id    BIGINT      NOT NULL REFERENCES public.consent_form_versions(id),
    consented_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    method             TEXT        NOT NULL DEFAULT 'written'
                           CHECK (method IN ('written', 'electronic', 'verbal_with_witness')),
    copy_delivered     BOOLEAN     NOT NULL DEFAULT FALSE,
    witnessed_by       UUID        REFERENCES auth.users(id),  -- required for verbal consent
    recorded_by        UUID        NOT NULL REFERENCES auth.users(id),
    notes              TEXT,
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select"
ON public.consent_records FOR SELECT TO authenticated
USING (public.can_read_only());

DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert"
ON public.consent_records FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data());

DROP TRIGGER IF EXISTS audit_consent_records ON public.consent_records;
CREATE TRIGGER audit_consent_records
    AFTER INSERT ON public.consent_records
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 22. Adverse Events / SAE table (SAFETY-01 to SAFETY-04)
-- ============================================================
-- Captures AEs/SAEs for regulatory submission and SUSAR classification.
-- Deadlines are calculated from the report_date per ICH E6(R3) requirements:
--   SAE expedited = 7 calendar days (fatal/unexpected); standard = 15 days.
CREATE TABLE IF NOT EXISTS public.adverse_events (
    id                      BIGSERIAL   PRIMARY KEY,
    study_id                UUID        NOT NULL REFERENCES public.studies(id),
    participant_id          TEXT        NOT NULL,
    ae_type                 TEXT        NOT NULL DEFAULT 'ae'
                                CHECK (ae_type IN ('ae', 'sae', 'susar')),
    description             TEXT        NOT NULL,
    severity                TEXT        NOT NULL
                                CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening', 'fatal')),
    causality               TEXT        NOT NULL
                                CHECK (causality IN ('unrelated', 'unlikely', 'possible', 'probable', 'definite')),
    expectedness            TEXT        NOT NULL DEFAULT 'unexpected'
                                CHECK (expectedness IN ('expected', 'unexpected')),
    onset_date              DATE,
    report_date             DATE        NOT NULL DEFAULT CURRENT_DATE,
    resolution_date         DATE,
    outcome                 TEXT        CHECK (outcome IN (
                                'recovered', 'recovering', 'not_recovered',
                                'recovered_with_sequelae', 'fatal', 'unknown'
                            )),
    -- Regulatory deadline calculated per AE type and severity
    authority_deadline      DATE,
    authority_submitted_at  TIMESTAMPTZ,
    reported_by             UUID        NOT NULL REFERENCES auth.users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    notes                   TEXT,
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

ALTER TABLE public.adverse_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adverse_events_select" ON public.adverse_events;
CREATE POLICY "adverse_events_select"
ON public.adverse_events FOR SELECT TO authenticated
USING (public.can_read_only());

DROP POLICY IF EXISTS "adverse_events_insert" ON public.adverse_events;
CREATE POLICY "adverse_events_insert"
ON public.adverse_events FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data());

DROP POLICY IF EXISTS "adverse_events_update" ON public.adverse_events;
CREATE POLICY "adverse_events_update"
ON public.adverse_events FOR UPDATE TO authenticated
USING (public.can_edit_data());

DROP TRIGGER IF EXISTS audit_adverse_events ON public.adverse_events;
CREATE TRIGGER audit_adverse_events
    AFTER INSERT OR UPDATE ON public.adverse_events
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 23. Site activation gate and edit-check rules (INT-01, INT-04)
-- ============================================================
-- Blocks data entry until the sponsor confirms site activation approvals.
ALTER TABLE public.studies
    ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (activation_status IN ('pending', 'active', 'suspended', 'closed'));

-- Edit-check rule definitions (configured by sponsor/DM, evaluated at data entry)
CREATE TABLE IF NOT EXISTS public.edit_check_rules (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    table_name      TEXT        NOT NULL,   -- 'measurements' or 'participants'
    field_name      TEXT        NOT NULL,
    rule_type       TEXT        NOT NULL    -- 'range', 'cross_field', 'required', 'regex'
                        CHECK (rule_type IN ('range', 'cross_field', 'required', 'regex')),
    rule_params     JSONB       NOT NULL,   -- e.g. {"min": 0, "max": 180} for range
    severity        TEXT        NOT NULL DEFAULT 'error'
                        CHECK (severity IN ('error', 'warning')),
    message         TEXT        NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by      UUID        REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

ALTER TABLE public.edit_check_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edit_check_rules_select" ON public.edit_check_rules;
CREATE POLICY "edit_check_rules_select"
ON public.edit_check_rules FOR SELECT TO authenticated
USING (public.can_read_only());

DROP POLICY IF EXISTS "edit_check_rules_insert" ON public.edit_check_rules;
CREATE POLICY "edit_check_rules_insert"
ON public.edit_check_rules FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "edit_check_rules_update" ON public.edit_check_rules;
CREATE POLICY "edit_check_rules_update"
ON public.edit_check_rules FOR UPDATE TO authenticated
USING (public.is_mentor());

-- ============================================================
-- 24. Delegation of duties log (ACC-03, AUTH-03)
-- ============================================================
-- Records formal delegation of investigator duties to sub-investigators / site staff.
CREATE TABLE IF NOT EXISTS public.delegations (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    delegated_to    UUID        NOT NULL REFERENCES auth.users(id),
    role_delegated  TEXT        NOT NULL,
    task_description TEXT       NOT NULL,
    delegated_by    UUID        NOT NULL REFERENCES auth.users(id),
    effective_from  DATE        NOT NULL,
    effective_to    DATE,
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID        REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delegations_select" ON public.delegations;
CREATE POLICY "delegations_select"
ON public.delegations FOR SELECT TO authenticated
USING (public.can_read_only());

DROP POLICY IF EXISTS "delegations_insert" ON public.delegations;
CREATE POLICY "delegations_insert"
ON public.delegations FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "delegations_update" ON public.delegations;
CREATE POLICY "delegations_update"
ON public.delegations FOR UPDATE TO authenticated
USING (public.is_mentor());

DROP TRIGGER IF EXISTS audit_delegations ON public.delegations;
CREATE TRIGGER audit_delegations
    AFTER INSERT OR UPDATE ON public.delegations
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 25. Blinding — treatment assignment vault and unblinding log (BLIND-01, BLIND-02, BLIND-03)
-- ============================================================
-- Treatment assignments are stored in a separate table accessible only to
-- unblinded roles. The study's main data tables never contain treatment codes.
-- emergency_unblinding provides an audited route to reveal assignments.

-- Multi-sponsor organisations (required before blinding can be fully scoped)
CREATE TABLE IF NOT EXISTS public.organisations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    type        TEXT        NOT NULL DEFAULT 'sponsor'
                    CHECK (type IN ('sponsor', 'cro', 'site', 'irb')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Link profiles to organisations for multi-sponsor scoping (ACC-01, ACC-02)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id);

-- Blinding: treatment assignment vault
-- access_level controls which roles can see treatment assignment:
--   'unblinded_only' = only sponsor_admin/mentor can query
--   'open_label'     = all operational roles can see assignments
CREATE TABLE IF NOT EXISTS public.treatment_assignments (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    participant_id  TEXT        NOT NULL,
    randomisation_code TEXT     NOT NULL,
    treatment_arm   TEXT        NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    assigned_by     UUID        NOT NULL REFERENCES auth.users(id),
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

ALTER TABLE public.treatment_assignments ENABLE ROW LEVEL SECURITY;

-- Only sponsor_admin/mentor can read treatment assignments (blinded study default)
DROP POLICY IF EXISTS "treatment_assignments_select" ON public.treatment_assignments;
CREATE POLICY "treatment_assignments_select"
ON public.treatment_assignments FOR SELECT TO authenticated
USING (public.is_mentor());

DROP POLICY IF EXISTS "treatment_assignments_insert" ON public.treatment_assignments;
CREATE POLICY "treatment_assignments_insert"
ON public.treatment_assignments FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP TRIGGER IF EXISTS audit_treatment_assignments ON public.treatment_assignments;
CREATE TRIGGER audit_treatment_assignments
    AFTER INSERT ON public.treatment_assignments
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Emergency unblinding log (BLIND-03)
CREATE TABLE IF NOT EXISTS public.unblinding_events (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    participant_id  TEXT,
    reason          TEXT        NOT NULL,
    requested_by    UUID        NOT NULL REFERENCES auth.users(id),
    approved_by     UUID        REFERENCES auth.users(id),
    revealed_arm    TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

ALTER TABLE public.unblinding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unblinding_events_select" ON public.unblinding_events;
CREATE POLICY "unblinding_events_select"
ON public.unblinding_events FOR SELECT TO authenticated
USING (public.is_mentor());

DROP POLICY IF EXISTS "unblinding_events_insert" ON public.unblinding_events;
CREATE POLICY "unblinding_events_insert"
ON public.unblinding_events FOR INSERT TO authenticated
WITH CHECK (public.is_mentor());

DROP TRIGGER IF EXISTS audit_unblinding_events ON public.unblinding_events;
CREATE TRIGGER audit_unblinding_events
    AFTER INSERT ON public.unblinding_events
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 26. IP / IRT accountability (IP-01 to IP-04)
-- ============================================================
-- Tracks investigational product dispensation and inventory.
CREATE TABLE IF NOT EXISTS public.ip_inventory (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    batch_number    TEXT        NOT NULL,
    treatment_arm   TEXT        NOT NULL,
    quantity_received INT       NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    expiry_date     DATE,
    received_by     UUID        NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ip_dispensations (
    id              BIGSERIAL   PRIMARY KEY,
    study_id        UUID        NOT NULL REFERENCES public.studies(id),
    participant_id  TEXT        NOT NULL,
    inventory_id    BIGINT      NOT NULL REFERENCES public.ip_inventory(id),
    quantity_dispensed INT      NOT NULL,
    dispensed_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    dispensed_by    UUID        NOT NULL REFERENCES auth.users(id),
    visit_number    TEXT,
    FOREIGN KEY (participant_id, study_id) REFERENCES public.participants (id, study_id)
);

ALTER TABLE public.ip_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_dispensations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ip_inventory_select" ON public.ip_inventory;
CREATE POLICY "ip_inventory_select"
ON public.ip_inventory FOR SELECT TO authenticated USING (public.can_read_only());

DROP POLICY IF EXISTS "ip_inventory_insert" ON public.ip_inventory;
CREATE POLICY "ip_inventory_insert"
ON public.ip_inventory FOR INSERT TO authenticated WITH CHECK (public.can_edit_data());

DROP POLICY IF EXISTS "ip_dispensations_select" ON public.ip_dispensations;
CREATE POLICY "ip_dispensations_select"
ON public.ip_dispensations FOR SELECT TO authenticated USING (public.can_read_only());

DROP POLICY IF EXISTS "ip_dispensations_insert" ON public.ip_dispensations;
CREATE POLICY "ip_dispensations_insert"
ON public.ip_dispensations FOR INSERT TO authenticated WITH CHECK (public.can_edit_data());

DROP TRIGGER IF EXISTS audit_ip_inventory ON public.ip_inventory;
CREATE TRIGGER audit_ip_inventory
    AFTER INSERT OR UPDATE ON public.ip_inventory
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_ip_dispensations ON public.ip_dispensations;
CREATE TRIGGER audit_ip_dispensations
    AFTER INSERT ON public.ip_dispensations
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- Migration: Candidate State + Study Access Control
-- ============================================================

-- 26. Update profiles status check to include 'candidate'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('candidate', 'pending', 'active', 'suspended'));

-- 27. Add candidate_expires_at column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS candidate_expires_at TIMESTAMPTZ;

-- 28. Update the signup trigger to create candidates, not pending users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status, candidate_expires_at)
  VALUES (
    NEW.id,
    NEW.email,
    'team_member',
    'candidate',
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$;

-- 29. Cleanup function: hard-deletes expired candidates
CREATE OR REPLACE FUNCTION public.cleanup_expired_candidates()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.profiles
    WHERE status = 'candidate'
      AND candidate_expires_at < NOW()
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 30. Profile status change audit — skips candidate pre-activation rows
CREATE OR REPLACE FUNCTION public.log_profile_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Skip audit for pre-activation state (candidates were never real users)
  IF OLD.status = 'candidate' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_log (
    study_id, table_name, record_id, action, actor_id,
    old_value, new_value, reason, created_at
  ) VALUES (
    NULL,
    'profiles',
    NEW.id::TEXT,
    'STATUS_CHANGE',
    auth.uid(),
    jsonb_build_object('status', OLD.status, 'role', OLD.role),
    jsonb_build_object('status', NEW.status, 'role', NEW.role),
    NEW.change_reason,
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 31. Study Members table
CREATE TABLE IF NOT EXISTS public.study_members (
  study_id     UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_role   TEXT NOT NULL,
  granted_by   UUID REFERENCES auth.users(id),
  granted_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (study_id, user_id)
);

-- RLS for study_members
ALTER TABLE public.study_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_members_read" ON public.study_members;
CREATE POLICY "study_members_read" ON public.study_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'
            AND role IN ('mentor', 'sponsor_admin', 'investigator', 'site_coordinator',
                         'data_manager', 'monitor', 'auditor', 'irb_reviewer'))
  );

DROP POLICY IF EXISTS "study_members_write" ON public.study_members;
CREATE POLICY "study_members_write" ON public.study_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'
            AND role IN ('mentor', 'sponsor_admin'))
  );

-- Audit trigger for study_members
CREATE OR REPLACE FUNCTION public.audit_study_members()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, new_value, created_at)
    VALUES (NEW.study_id, 'study_members', NEW.user_id::TEXT, 'INSERT', auth.uid(),
            jsonb_build_object('user_id', NEW.user_id, 'study_role', NEW.study_role), NOW());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, old_value, created_at)
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
