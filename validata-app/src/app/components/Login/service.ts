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

  // Get profile details to read role and status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  let role = 'team_member';
  let status = 'pending';

  if (profileError || !profile) {
    // Profile not created yet, insert it
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        role: 'team_member',
        status: 'pending'
      })
      .select()
      .single();

    if (!createError && newProfile) {
      role = newProfile.role;
      status = newProfile.status;
    }
  } else {
    role = profile.role;
    status = profile.status;
  }

  // @supabase/ssr already persisted the session itself (in its own cookies,
  // kept fresh by src/proxy.js); these are just our own role/status cache
  // for the proxy.js status gate and SessionContext's profile-fetch fallback.
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

export const performDemoLogin = (role: string, email: string): { success: boolean } => {
  // page.js and auth-server.js both parse this cookie as JSON ({ email, role,
  // status }) to build the demo session - it must not be a bare string.
  setCookie('demo-session', JSON.stringify({ email, role, status: 'active' }), 7);
  setCookie('user-role', role, 7);
  setCookie('user-status', 'active', 7);
  return { success: true };
};
