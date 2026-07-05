import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Profile = {
  role: string; // expanded role set defined in schemas.ts roleSchema
  status: 'candidate' | 'pending' | 'active' | 'suspended';
  deleted_at?: string | null;
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

// ICH E6(R3) SEC-01 / AUTH-01: Demo Mode must be disabled in production
// deployments. Set NEXT_PUBLIC_DEMO_ENABLED=false in Vercel production env
// vars. When absent or set to 'true', demo mode is available (dev/staging only).
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED !== 'false';

// Resolves who's making the request (demo or real Supabase user) and their
// profile, without judging whether their account status is allowed to
// proceed - that gate differs by caller (API routes reject non-active users
// outright; the dashboard layout instead needs to render a "pending" /
// "suspended" screen for them). See verifySession() and getDashboardSession().
async function resolveSession(): Promise<Session> {
  const cookieStore = await cookies();
  const demoSessionCookie = cookieStore.get('demo-session')?.value;

  // ICH E6(R3) SEC-01: reject the demo cookie when demo mode is disabled in
  // production so a tampered cookie cannot bypass real authentication.
  if (demoSessionCookie && DEMO_ENABLED) {
    try {
      const sessionData = JSON.parse(demoSessionCookie);
      return {
        user: { id: 'demo-user-id', email: sessionData.email },
        profile: { role: sessionData.role, status: 'active' },
        isDemo: true,
        supabaseClient: null
      };
    } catch {
      // Failed to parse, proceed to real auth checks
    }
  }

  // The session lives in cookies managed by @supabase/ssr (kept fresh by
  // src/proxy.ts on every request), so no bearer token needs passing here.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized. Invalid session token.', status: 401 };
  }

  // Fetch the user's role and status from the profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status, deleted_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // If user exists in Auth but has no profile, create a candidate profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'team_member',
        status: 'candidate',
        candidate_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

  if (profile.deleted_at) {
    return { error: 'Forbidden. This account has been deleted.', status: 403 };
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
// Candidate/pending/suspended users are still resolved successfully here - the layout
// renders a status screen for them instead of dashboard content.
export async function getDashboardSession(): Promise<Session> {
  return resolveSession();
}

// ICH E6(R3) AUTH-02: role helpers used by API routes and Server Actions
// to enforce function-based access control beyond the basic active/pending gate.

// 'admin' sits above 'mentor' (separation of duties: only an admin can change
// or remove a mentor/admin account, so mentors can't lock each other out).
// It carries every mentor capability plus that one extra power, so isMentor()
// and canEditData() both treat admin as a superset of mentor.
export function isAdmin(session: ResolvedSession): boolean {
  return session.profile.role === 'admin';
}

export function isMentor(session: ResolvedSession): boolean {
  return session.profile.role === 'mentor' || session.profile.role === 'admin';
}

export function canEditData(session: ResolvedSession): boolean {
  return ['admin', 'mentor', 'investigator', 'site_coordinator', 'data_manager'].includes(
    session.profile.role
  );
}

export function canReadOnly(session: ResolvedSession): boolean {
  return canEditData(session) || ['monitor', 'auditor', 'irb_reviewer'].includes(session.profile.role);
}

// Mentors can still promote someone to mentor (e.g. approving a co-PI) — that
// stays unrestricted. What's blocked is a mentor touching an account that is
// ALREADY mentor/admin (role change, suspend, or delete) — that's the actual
// fix for "two mentors can't terminate each other" — and granting the admin
// role itself, which only an existing admin may do.
// `currentRole` = the target account's role right now. `newRole` = the role
// being assigned in this request, if any (omit for status-only changes or delete).
export function canManageAccount(session: ResolvedSession, currentRole: string, newRole?: string): boolean {
  if (currentRole === 'mentor' || currentRole === 'admin') {
    return isAdmin(session);
  }
  if (newRole === 'admin') {
    return isAdmin(session);
  }
  return isMentor(session);
}
