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

-- 4. Enable RLS on other tables (if not already enabled) and add Policies
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

