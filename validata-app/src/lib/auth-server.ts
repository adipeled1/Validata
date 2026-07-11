import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import { verifyDemoSession } from './demoSession';
import { ADMIN_ROLES, EDIT_ROLES, READABLE_ROLES, hasRole } from './permissions';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Profile = {
  role: string; // 'applicant' plus the operational role set defined in schemas.ts roleSchema
  status: 'wait_email_confirm' | 'wait_approval' | 'active' | 'suspended' | 'deleted';
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
// deployments, and must fail closed - so it is opt-IN (default disabled),
// not opt-out. Set NEXT_PUBLIC_DEMO_ENABLED=true to enable it in dev/staging.
// A missing/misnamed env var now means demo mode is OFF, not on.
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true';

if (DEMO_ENABLED && process.env.NODE_ENV === 'production') {
  console.warn(
    '[SECURITY WARNING] NEXT_PUBLIC_DEMO_ENABLED=true in a production build. ' +
    'Demo mode should never be enabled in a real deployment - remove this env var.'
  );
}

// Resolves who's making the request (demo or real Supabase user) and their
// profile, without judging whether their account status is allowed to
// proceed - that gate differs by caller (API routes reject non-active users
// outright; the dashboard layout instead needs to render an onboarding /
// "suspended" screen for them). See verifySession() and getDashboardSession().
async function resolveSession(): Promise<Session> {
  const cookieStore = await cookies();
  const demoSessionCookie = cookieStore.get('demo-session')?.value;

  // ICH E6(R3) SEC-01: reject the demo cookie when demo mode is disabled, AND
  // reject it if its HMAC signature doesn't verify - it is minted only by
  // POST /api/auth/demo-login (see demoSession.ts), so an unsigned or
  // tampered cookie (e.g. hand-written via document.cookie with role=admin)
  // cannot bypass real authentication.
  if (demoSessionCookie && DEMO_ENABLED) {
    const sessionData = await verifyDemoSession(demoSessionCookie);
    if (sessionData) {
      return {
        user: { id: 'demo-user-id', email: sessionData.email },
        profile: { role: sessionData.role, status: 'active' },
        isDemo: true,
        supabaseClient: null
      };
    }
    // Signature invalid/missing secret - fall through to real auth checks.
  }

  // The session lives in cookies managed by @supabase/ssr (kept fresh by
  // src/proxy.ts on every request), so no bearer token needs passing here.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized. Invalid session token.', status: 401 };
  }

  // Fetch the user's role and status from the profiles table. Applicants
  // (role = 'applicant') are deliberately excluded by RLS from this direct
  // select - onboarding lifecycle restructure: applicants are blocked from
  // every possible database read - so this returns no row for them by
  // design, not because their profile doesn't exist.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status, deleted_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // Fall back to the narrow my_onboarding_status() RPC, which is exactly
    // the "which onboarding screen do I show" signal an applicant is
    // allowed to read - it returns only the caller's own status, nothing
    // else. handle_new_user() already creates a profile row on every
    // sign-up, so application code never creates one here.
    const { data: onboardingStatus } = await supabase.rpc('my_onboarding_status');
    if (onboardingStatus) {
      return {
        user: { id: user.id, email: user.email ?? '' },
        profile: { role: 'applicant', status: onboardingStatus as Profile['status'] },
        isDemo: false,
        supabaseClient: supabase
      };
    }

    // Truly no profile row and not an applicant either - shouldn't happen
    // given handle_new_user(), but there is no legitimate account state this
    // could represent, so treat it as a session error rather than guessing.
    console.error('No profile found for authenticated user:', user.id);
    return { error: 'Forbidden. No profile found for this account.', status: 403 };
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
// Applicants (wait_email_confirm/wait_approval) and suspended users are
// still resolved successfully here - the layout renders an onboarding/status
// screen for them instead of dashboard content.
export async function getDashboardSession(): Promise<Session> {
  return resolveSession();
}

// ICH E6(R3) AUTH-02: role helpers used by API routes and Server Actions
// to enforce function-based access control beyond the basic active/status gate.

// 'admin' sits above 'mentor' (separation of duties: only an admin can change
// or remove a mentor/admin account, so mentors can't lock each other out).
// It carries every mentor capability plus that one extra power, so isMentor()
// and canEditData() both treat admin as a superset of mentor.
// These are thin wrappers over the canonical role sets in permissions.ts -
// see that file for the single source of truth this is built on.
export function isAdmin(session: ResolvedSession): boolean {
  return session.profile.role === 'admin';
}

export function isMentor(session: ResolvedSession): boolean {
  return hasRole(session.profile.role, ADMIN_ROLES);
}

export function canEditData(session: ResolvedSession): boolean {
  return hasRole(session.profile.role, EDIT_ROLES);
}

export function canReadOnly(session: ResolvedSession): boolean {
  return hasRole(session.profile.role, READABLE_ROLES);
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
