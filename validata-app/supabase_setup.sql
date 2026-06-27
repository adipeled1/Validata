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
