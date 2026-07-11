import { createClient } from '../../../lib/supabase/client';
import { setCookie } from '../../../lib/cookies';

const supabase = createClient();

export const signInWithSupabase = async (email: string, password: string): Promise<{ success: boolean }> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  const session = data.session;
  if (!session) throw new Error('Could not establish session.');

  // Get profile details to read role and status. Applicants (role =
  // 'applicant') are excluded by RLS from this direct select - it returns
  // no row for them by design, not because their profile doesn't exist -
  // so fall back to the narrow my_onboarding_status() RPC, which is the one
  // thing an applicant is allowed to read about their own account.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  let role = 'applicant';
  let status = 'wait_email_confirm';

  if (profileError || !profile) {
    const { data: onboardingStatus } = await supabase.rpc('my_onboarding_status');
    if (onboardingStatus) {
      status = onboardingStatus;
    }
  } else {
    role = profile.role;
    status = profile.status;
  }

  // @supabase/ssr already persisted the session itself (in its own cookies,
  // kept fresh by src/proxy.ts); these are just our own role/status cache,
  // read only as a UI hint (SessionContext) - not trusted for access
  // decisions server-side.
  setCookie('user-role', role, 7);
  setCookie('user-status', status, 7);

  return { success: true };
};

export const signUpWithSupabase = async (email: string, password: string): Promise<{ success: boolean }> => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return { success: true };
};

export const performDemoLogin = async (email: string, password: string): Promise<{ success: boolean; role?: string }> => {
  // The demo-session cookie is not written directly by the client - it's
  // minted server-side (HMAC-signed) by POST /api/auth/demo-login after
  // checking DEMO_ENABLED and the fixed demo credential list, and set as
  // HttpOnly so it can't be read/forged from devtools. See lib/demoSession.ts.
  const response = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Demo login failed.');
  }

  // user-role/user-status remain client-readable UI-only hints (see
  // SessionContext.tsx); server-side authority now always comes from the
  // signed demo-session cookie, verified in auth-server.ts/proxy.ts.
  setCookie('user-role', data.role, 7);
  setCookie('user-status', 'active', 7);
  return { success: true, role: data.role };
};
