import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Profile = {
  role: 'mentor' | 'team_member';
  status: 'pending' | 'active' | 'suspended';
};

export type ResolvedSession = {
  user: { id: string; email: string };
  profile: Profile;
  isDemo: boolean;
  supabaseClient: SupabaseClient | null;
};

export type SessionError = {
  error: string;
  status: number;
};

export type Session = ResolvedSession | SessionError;

// Resolves who's making the request (demo or real Supabase user) and their
// profile, without judging whether their account status is allowed to
// proceed - that gate differs by caller (API routes reject non-active users
// outright; the dashboard layout instead needs to render a "pending" /
// "suspended" screen for them). See verifySession() and getDashboardSession().
async function resolveSession(): Promise<Session> {
  const cookieStore = await cookies();
  const demoSessionCookie = cookieStore.get('demo-session')?.value;

  if (demoSessionCookie) {
    try {
      const sessionData = JSON.parse(demoSessionCookie);
      return {
        user: { id: 'demo-user-id', email: sessionData.email },
        profile: { role: sessionData.role, status: 'active' },
        isDemo: true,
        supabaseClient: null
      };
    } catch (e) {
      // Failed to parse, proceed to real auth checks
    }
  }

  // The session lives in cookies managed by @supabase/ssr (kept fresh by
  // src/proxy.js on every request), so no bearer token needs passing here.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized. Invalid session token.', status: 401 };
  }

  // Fetch the user's role and status from the profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // If user exists in Auth but has no profile, let's create a pending profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'team_member',
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile for user:', createError);
      return { error: 'Forbidden. Profile setup failed.', status: 403 };
    }

    return {
      user: { id: user.id, email: user.email ?? '' },
      profile: newProfile as Profile,
      isDemo: false,
      supabaseClient: supabase
    };
  }

  return {
    user: { id: user.id, email: user.email ?? '' },
    profile: profile as Profile,
    isDemo: false,
    supabaseClient: supabase
  };
}

// For API routes: only active accounts may proceed.
export async function verifySession(): Promise<Session> {
  const session = await resolveSession();
  if ('error' in session) return session;

  if (session.profile.status !== 'active') {
    return { error: `Forbidden. Account status is ${session.profile.status}`, status: 403 };
  }

  return session;
}

// For the dashboard layout (Server Component): resolves the session once,
// server-side, so the client doesn't need its own separate auth check.
// Pending/suspended users are still resolved successfully here - the layout
// renders a status screen for them instead of dashboard content.
export async function getDashboardSession(): Promise<Session> {
  return resolveSession();
}
