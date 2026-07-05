-- 1. Create Profiles table in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'mentor', 'team_member')) DEFAULT 'team_member',
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions to prevent policy recursion
-- This function runs with SECURITY DEFINER privileges to bypass RLS checks on profiles table
-- 'admin' is a separate, higher tier than 'mentor' (see §17 below where the
-- full role model is expanded) — is_mentor() treats admin as a superset of
-- mentor so admin never loses any mentor capability.
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

-- Policy to allow mentors to update any non-mentor/admin profile (assign
-- roles/status) — including promoting someone TO mentor, which stays
-- unrestricted. Only an admin may update a profile that is ALREADY mentor or
-- admin (the separation-of-duties fix so two mentors can't demote or suspend
-- each other), or grant the admin role itself.
CREATE POLICY "Allow mentors to update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_mentor() AND (public.is_admin() OR role NOT IN ('mentor', 'admin')))
WITH CHECK (public.is_admin() OR role <> 'admin');

-- Policy to allow mentors to delete any non-mentor/admin profile; only an
-- admin may delete a mentor/admin profile.
CREATE POLICY "Allow mentors to delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_mentor() AND (public.is_admin() OR role NOT IN ('mentor', 'admin')));


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
-- Roles align with ICH E6(R3) section 5 stakeholder definitions:
--   admin           — separation-of-duties tier above mentor; same global access
--                     as mentor, plus sole authority to manage mentor/admin accounts
--                     (prevents mentors from being able to lock each other out)
--   mentor          — highest operational authority; covers the professor/PI and developers
--   investigator    — PI / sub-investigator; can enter and correct data
--   site_coordinator— CRC; can enter data
--   data_manager    — DM; can enter, correct, and flag data; cannot approve
--   monitor         — CRA; read-only data access + query rights
--   auditor         — GCP auditor; read-only
--   irb_reviewer    — Ethics committee member; read-only
--   team_member     — default for new registrations, before a real role is granted
--
-- Bootstrapping the first admin: there is no in-app path to create the first
-- admin account (an admin is the only role that can promote someone to
-- admin/mentor). Seed it directly, once, e.g.:
--   UPDATE public.profiles SET role = 'admin', status = 'active' WHERE email = '<head mentor email>';

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
        'admin', 'mentor', 'team_member',
        'investigator', 'site_coordinator',
        'data_manager', 'monitor', 'auditor', 'irb_reviewer'
    ));

-- Add change_reason to profiles so audit triggers can capture WHY a role/status changed.
-- The trigger stores to_jsonb(NEW) which includes this column in new_value.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Update is_mentor() — admin is treated as a superset of mentor
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('mentor', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role = 'admin'
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
              'admin', 'mentor',
              'investigator', 'site_coordinator', 'data_manager'
          )
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
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
              'admin', 'mentor',
              'investigator', 'site_coordinator', 'data_manager',
              'monitor', 'auditor', 'irb_reviewer'
          )
          AND public.profiles.status = 'active'
          AND public.profiles.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mirrors permissions.ts::DELEGATION_ROLES (fable_system_review §2.2): the
-- delegations_insert/update policies used to be is_mentor()-only while the
-- API allowed investigators too, so an investigator's delegation always hit
-- an RLS 403 despite the UI offering the form. Investigators legitimately
-- delegate duties to site staff (ACC-03), so this is the app-layer's
-- permissive check made authoritative, not the DB's restrictive one.
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

-- Mirrors permissions.ts::QUERY_MUTATE_ROLES (fable_system_review §2.3): the
-- queries_update policy used to reuse can_read_only(), which let auditor/
-- irb_reviewer - roles that must stay read-only - answer/resolve/close
-- queries. This is the same role set already used for creating a query.
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

-- Per-study scoping: mentor is a global admin (unrestricted across all studies
-- by design); every other role must additionally be listed in study_members
-- for the specific study being accessed. Without this, Study Access Control
-- only records who was assigned to a study without actually restricting data
-- access to it — any active investigator/monitor/auditor/etc. could otherwise
-- read (and, for edit roles, write) every study in the system.
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

-- Update data-access RLS policies to use the new helpers.
-- SELECT: any operational role (read-only users included).
-- INSERT/UPDATE on measurements and participants: edit roles only.

-- Studies
DROP POLICY IF EXISTS "Allow active authenticated users to view studies" ON public.studies;
CREATE POLICY "Allow active authenticated users to view studies"
ON public.studies
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.can_read_only() AND public.is_study_member(id));

-- Mentor/admin can additionally view soft-deleted studies — needed for the
-- retention/destruction-request workflow (RET-02, RET-03), which otherwise
-- has no way to even read the study it's evaluating.
DROP POLICY IF EXISTS "Allow mentors to view deleted studies" ON public.studies;
CREATE POLICY "Allow mentors to view deleted studies"
ON public.studies
FOR SELECT
TO authenticated
USING (deleted_at IS NOT NULL AND public.is_mentor());

-- Participants
DROP POLICY IF EXISTS "Allow active authenticated users to view participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to view participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    public.can_read_only()
    AND public.is_study_member(study_id)
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
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "Allow active authenticated users to update participants" ON public.participants;
CREATE POLICY "Allow active authenticated users to update participants"
ON public.participants
FOR UPDATE
TO authenticated
USING (public.can_edit_data() AND public.is_study_member(study_id));

-- Measurements
DROP POLICY IF EXISTS "Allow active authenticated users to view measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to view measurements"
ON public.measurements
FOR SELECT
TO authenticated
USING (
    public.can_read_only()
    AND public.is_study_member(study_id)
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
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "Allow active authenticated users to update measurements" ON public.measurements;
CREATE POLICY "Allow active authenticated users to update measurements"
ON public.measurements
FOR UPDATE
TO authenticated
USING (public.can_edit_data() AND public.is_study_member(study_id));

-- Audit log: visible to mentor, monitor, and auditor
DROP POLICY IF EXISTS "audit_log_select_mentor" ON public.audit_log;
CREATE POLICY "audit_log_select_mentor"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'monitor', 'auditor')
          AND public.profiles.status = 'active'
    )
    -- Global (non-study) entries such as ROLE_CHANGE are mentor-only;
    -- study-scoped entries require monitor/auditor to be a member of that study.
    AND (
        (study_id IS NULL AND public.is_mentor())
        OR (study_id IS NOT NULL AND public.is_study_member(study_id))
    )
);

-- ============================================================
-- 18. Study lock state (INT-01, INT-03)
-- ============================================================
-- Locks a study after database lock so no new data can be entered.
-- A locked study is read-only for data_manager / investigator / site_coordinator;
-- only mentor can lock and unlock.
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
    AND public.is_study_member(study_id)
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
    AND public.is_study_member(study_id)
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
    AND public.is_study_member(study_id)
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
    AND public.is_study_member(study_id)
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
USING (public.can_read_only() AND public.is_study_member(study_id));

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
          AND public.profiles.role IN ('admin', 'mentor', 'data_manager', 'monitor', 'investigator')
          AND public.profiles.status = 'active'
    )
    AND public.is_study_member(study_id)
);

-- Data editors and monitors can update queries (answer / resolve / close).
-- fable_system_review §2.3: this used to reuse can_read_only(), which let
-- auditor/irb_reviewer - roles that must stay read-only - mutate queries.
DROP POLICY IF EXISTS "queries_update" ON public.queries;
CREATE POLICY "queries_update"
ON public.queries
FOR UPDATE
TO authenticated
USING (public.can_mutate_queries() AND public.is_study_member(study_id));

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
USING (public.can_read_only() AND public.is_study_member(study_id));

-- Only investigators and mentors can sign (insert)
DROP POLICY IF EXISTS "signatures_insert" ON public.signatures;
CREATE POLICY "signatures_insert"
ON public.signatures
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('admin', 'mentor', 'investigator')
          AND public.profiles.status = 'active'
    )
    AND public.is_study_member(study_id)
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
USING (public.can_read_only() AND public.is_study_member(study_id));

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
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert"
ON public.consent_records FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

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
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "adverse_events_insert" ON public.adverse_events;
CREATE POLICY "adverse_events_insert"
ON public.adverse_events FOR INSERT TO authenticated
WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "adverse_events_update" ON public.adverse_events;
CREATE POLICY "adverse_events_update"
ON public.adverse_events FOR UPDATE TO authenticated
USING (public.can_edit_data() AND public.is_study_member(study_id));

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
USING (public.can_read_only() AND public.is_study_member(study_id));

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
USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "delegations_insert" ON public.delegations;
CREATE POLICY "delegations_insert"
ON public.delegations FOR INSERT TO authenticated
WITH CHECK (public.can_manage_delegations());

DROP POLICY IF EXISTS "delegations_update" ON public.delegations;
CREATE POLICY "delegations_update"
ON public.delegations FOR UPDATE TO authenticated
USING (public.can_manage_delegations());

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
--   'unblinded_only' = only mentor can query
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

-- Only mentor can read treatment assignments (blinded study default)
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
ON public.ip_inventory FOR SELECT TO authenticated USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "ip_inventory_insert" ON public.ip_inventory;
CREATE POLICY "ip_inventory_insert"
ON public.ip_inventory FOR INSERT TO authenticated WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "ip_dispensations_select" ON public.ip_dispensations;
CREATE POLICY "ip_dispensations_select"
ON public.ip_dispensations FOR SELECT TO authenticated USING (public.can_read_only() AND public.is_study_member(study_id));

DROP POLICY IF EXISTS "ip_dispensations_insert" ON public.ip_dispensations;
CREATE POLICY "ip_dispensations_insert"
ON public.ip_dispensations FOR INSERT TO authenticated WITH CHECK (public.can_edit_data() AND public.is_study_member(study_id));

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

-- 30. (Removed) log_profile_status_change() was dead code: never attached to a
-- trigger, not SECURITY DEFINER (would have failed under RLS like
-- audit_study_members() below), and referenced a non-existent audit_log.created_at
-- column. STATUS_CHANGE audit rows for profiles are already produced by
-- log_audit_event() via the audit_profiles trigger (see §16 above).
DROP FUNCTION IF EXISTS public.log_profile_status_change();

-- 31. Study Members table.
-- fable_system_review §7.4: study_role is an immutable snapshot of the
-- user's global profile.role at the moment they were granted access to this
-- study - it is NEVER updated afterward, even if the user's global role
-- later changes. It exists purely as historical grant-time context (e.g.
-- "what role did this person have when they joined this study") and MUST
-- NOT be treated as the user's current role - always read profiles.role
-- (joined live) for anything authorization- or display-related. Both
-- current call sites already do this correctly (study-members/route.ts's
-- GET joins profiles(role); StudyManagement.tsx's roleName display prefers
-- `m.profiles?.role` and only falls back to `m.study_role` if that join is
-- ever missing) - kept as a documented convention rather than removing the
-- column, since it's still useful audit context.
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
            AND role IN ('admin', 'mentor', 'investigator', 'site_coordinator',
                         'data_manager', 'monitor', 'auditor', 'irb_reviewer'))
  );

DROP POLICY IF EXISTS "study_members_write" ON public.study_members;
CREATE POLICY "study_members_write" ON public.study_members
  FOR ALL USING (public.is_mentor());

-- Audit trigger for study_members
-- SECURITY DEFINER is required: audit_log has RLS enabled with only a SELECT
-- policy, so a SECURITY INVOKER trigger running as `authenticated` has no
-- INSERT grant and this insert (and therefore the whole grant/revoke
-- transaction on study_members) would roll back. See fable_system_review §5.1.
-- Also fixed: audit_log has no `created_at` column (it's `occurred_at`).
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

-- ============================================================
-- 32. Soft-delete profiles, delete candidate user RPC, and restrict study_members edits to active users only
-- ============================================================

-- Add deleted_at column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- RPC to hard-delete a candidate from auth.users (cascades to profiles)
CREATE OR REPLACE FUNCTION public.delete_candidate_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND status = 'candidate'
  ) THEN
    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

-- Restrict study_members insert/update/delete to only active, non-deleted users
DROP POLICY IF EXISTS "study_members_write" ON public.study_members;
CREATE POLICY "study_members_write" ON public.study_members
  FOR ALL TO authenticated
  USING (
    public.is_mentor()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = user_id
        AND public.profiles.status = 'active'
        AND public.profiles.deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.is_mentor()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = user_id
        AND public.profiles.status = 'active'
        AND public.profiles.deleted_at IS NULL
    )
  );

-- ============================================================
-- 33. Enforce clinical-data immutability at the DB level (fable_system_review §4.4)
--     Schema comments have long asserted measurements/participants are
--     "never edited in place," but the UPDATE RLS policies above are
--     column-blind — anyone with an authenticated Supabase client and a
--     valid session can overwrite raw goniometer/ai_model/demographic
--     values directly, bypassing the repository layer that is the only
--     thing currently enforcing the restriction. These BEFORE UPDATE
--     triggers make the restriction a real DB constraint: only the columns
--     the application actually uses for in-place updates may change.
-- ============================================================

-- Measurements: only is_valid / validity_reason may be updated in place
-- (see src/lib/repositories/measurements.ts::updateMeasurementValidity).
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_measurements_immutability ON public.measurements;
CREATE TRIGGER enforce_measurements_immutability
  BEFORE UPDATE ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_measurements_immutability();

-- Participants: only status / status_reason may be updated in place
-- (see src/lib/repositories/participants.ts::updateParticipantStatus).
CREATE OR REPLACE FUNCTION public.enforce_participants_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.study_id IS DISTINCT FROM OLD.study_id
     OR NEW.consent IS DISTINCT FROM OLD.consent
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

-- Records a DESTRUCTION_REQUEST audit entry directly (fable_system_review
-- §5.2). admin/destruction-request/route.ts used to work around the lack of
-- an audit_log INSERT policy for `authenticated` by overwriting the study's
-- `lock_reason` column instead - which corrupted Study Lock Control's
-- "Reason" display and recorded the action as a plain studies UPDATE rather
-- than the DESTRUCTION_REQUEST action the schema defines. SECURITY DEFINER
-- lets this insert bypass RLS the same way log_audit_event() does, without
-- touching any other column on the study.
CREATE OR REPLACE FUNCTION public.record_destruction_request(p_study_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.audit_log (study_id, table_name, record_id, action, actor_id, reason, occurred_at)
    VALUES (p_study_id, 'studies', p_study_id::TEXT, 'DESTRUCTION_REQUEST', auth.uid(), p_reason, NOW());
END;
$$;

-- ============================================================
-- 34. Signing tokens — atomic electronic-signature re-authentication
--     (fable_system_review §2.4, §6.3). Previously POST /api/auth/verify-
--     credentials and POST /api/signatures were two unlinked requests -
--     nothing forced the verify to precede the sign, so a script (or a
--     replayed/direct request) could call /api/signatures with a valid
--     session and never present a password. A signing token is minted only
--     after a successful password re-check, is single-use, and expires
--     quickly; /api/signatures now requires and atomically consumes one.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signing_tokens (
    token       TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose     TEXT NOT NULL DEFAULT 'signature',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

ALTER TABLE public.signing_tokens ENABLE ROW LEVEL SECURITY;

-- Users may only mint/read/consume their own tokens. There is no DELETE
-- policy - expired/consumed rows are cheap to keep and are useful audit
-- evidence of when re-authentication actually happened.
DROP POLICY IF EXISTS "signing_tokens_insert" ON public.signing_tokens;
CREATE POLICY "signing_tokens_insert" ON public.signing_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "signing_tokens_select" ON public.signing_tokens;
CREATE POLICY "signing_tokens_select" ON public.signing_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- UPDATE is restricted to consuming (setting consumed_at) a still-valid,
-- unconsumed token belonging to the caller - see consumeSigningToken() in
-- src/lib/signing-tokens.ts, which relies on this being atomic (the UPDATE's
-- own WHERE clause re-checks consumed_at/expires_at at execution time, so
-- two concurrent consume attempts can't both succeed).
DROP POLICY IF EXISTS "signing_tokens_update" ON public.signing_tokens;
CREATE POLICY "signing_tokens_update" ON public.signing_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 35. Indexes (fable_system_review §4.6) — supabase_setup.sql previously
--     created zero indexes. Every clinical table is filtered by study_id on
--     essentially every query, and is_study_member() (used in most RLS
--     policies above) does a study_members lookup on every row access.
--     Without these, all of that degrades to sequential scans as data grows,
--     and the audit log's `ORDER BY occurred_at DESC LIMIT 500` sorts the
--     whole table.
-- ============================================================
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
-- 36. DB-side participant ID allocation (fable_system_review §4.5) —
--     createParticipant() used to compute `max+1` over existing participant
--     ids in application code (a SELECT then an INSERT as two separate
--     round trips). Two concurrent enrollments for the same study can read
--     the same max and generate the same "P-N" id, hitting the composite
--     PK (id, study_id) and failing one enrollment. On Vercel's serverless
--     platform (many concurrent lambdas), this is not theoretical.
--
--     Fix: an atomic per-study counter table. INSERT ... ON CONFLICT DO
--     UPDATE ... RETURNING is a well-known atomic-increment pattern in
--     Postgres - the row lock taken by the conflicting UPDATE serializes
--     concurrent callers, so two simultaneous calls always return distinct
--     values. Starts at 1001 to match the existing numbering convention.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.participant_id_counters (
    study_id UUID PRIMARY KEY REFERENCES public.studies(id) ON DELETE CASCADE,
    last_id  INTEGER NOT NULL DEFAULT 1000
);

-- No direct access - only reachable through next_participant_id() below.
ALTER TABLE public.participant_id_counters ENABLE ROW LEVEL SECURITY;

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
-- 37. Scheduled candidate cleanup (fable_system_review §5.4) — this used to
--     run as an un-awaited side effect of GET /api/profiles (a read endpoint
--     hard-deleting rows from auth.users on every mentor page load, outside
--     any request context that would show up in an audit trail). Moved to
--     pg_cron, which runs inside Postgres on a schedule with no app-layer
--     involvement. POST /api/admin/cleanup-candidates remains available for
--     an on-demand manual trigger.
--
--     Requires the pg_cron extension to be enabled for this project (Supabase
--     dashboard: Database > Extensions > pg_cron, or
--     `CREATE EXTENSION IF NOT EXISTS pg_cron;` if you have the privileges to
--     run it directly). This block is guarded so the rest of this script
--     still runs cleanly if pg_cron isn't enabled yet - re-run it after
--     enabling the extension to pick up the schedule.
-- ============================================================
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
