import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// vi.mock is hoisted above regular imports/consts, so the mock object itself
// must be created via vi.hoisted() - otherwise the factory closes over a
// `mockSupabase` binding that doesn't exist yet (TDZ) by the time
// service.ts's own module-level createClient() call runs.
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));
vi.mock('../../../lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

import { performDemoLogin, signInWithSupabase, signUpWithSupabase } from './service';
import { getCookie } from '../../../lib/cookies';

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  });
}

describe('signInWithSupabase', () => {
  beforeEach(() => {
    clearCookies();
    vi.clearAllMocks();
  });

  function fakeProfileQuery(result: { data: any; error: any }) {
    const single = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });
  }

  it('signs in and caches role/status from the profile row', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: {}, user: { id: 'u1' } },
      error: null,
    });
    fakeProfileQuery({ data: { role: 'mentor', status: 'active' }, error: null });

    const result = await signInWithSupabase('mentor@live.com', 'secret');
    expect(result.success).toBe(true);
    expect(getCookie('user-role')).toBe('mentor');
    expect(getCookie('user-status')).toBe('active');
  });

  it('falls back to my_onboarding_status() RPC for an applicant with no profile row', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: {}, user: { id: 'u2' } },
      error: null,
    });
    fakeProfileQuery({ data: null, error: { message: 'no rows' } });
    mockSupabase.rpc.mockResolvedValue({ data: 'wait_approval' });

    await signInWithSupabase('applicant@live.com', 'secret');
    expect(getCookie('user-role')).toBe('applicant');
    expect(getCookie('user-status')).toBe('wait_approval');
  });

  it('throws on invalid credentials without caching anything', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid login credentials') });
    await expect(signInWithSupabase('x@x.com', 'wrong')).rejects.toThrow('Invalid login credentials');
    expect(getCookie('user-role')).toBeNull();
  });

  it('throws when the session is missing even though there was no error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null });
    await expect(signInWithSupabase('x@x.com', 'pw')).rejects.toThrow('Could not establish session.');
  });
});

describe('signUpWithSupabase', () => {
  it('calls auth.signUp and resolves on success', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null });
    const result = await signUpWithSupabase('new@live.com', 'secret');
    expect(result.success).toBe(true);
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({ email: 'new@live.com', password: 'secret' });
  });

  it('throws on a signup error (e.g. email already registered)', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: new Error('User already registered') });
    await expect(signUpWithSupabase('dup@live.com', 'secret')).rejects.toThrow('User already registered');
  });
});

// performDemoLogin does not write the demo-session cookie itself (it's
// HMAC-signed and HttpOnly, set by the server in POST /api/auth/demo-login)
// - it just calls that endpoint and caches the UI-only user-role/user-status
// hints.
describe('performDemoLogin (demo login golden path)', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the demo-login endpoint and caches the returned role', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, role: 'mentor', email: 'mentor@demo.com' }),
    }));

    const result = await performDemoLogin('mentor@demo.com', 'demo123');
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/auth/demo-login', expect.objectContaining({ method: 'POST' }));

    expect(getCookie('user-role')).toBe('mentor');
    expect(getCookie('user-status')).toBe('active');
  });

  it('supports the team_member demo role too', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, role: 'team_member', email: 'team@demo.com' }),
    }));

    await performDemoLogin('team@demo.com', 'demo123');
    expect(getCookie('user-role')).toBe('team_member');
  });

  it('throws when the server rejects the credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid demo credentials.' }),
    }));

    await expect(performDemoLogin('wrong@demo.com', 'nope')).rejects.toThrow('Invalid demo credentials.');
  });
});
