import { describe, it, expect, vi, beforeEach } from 'vitest';

// auth-server.ts pulls its Supabase client from ./supabase/server and its
// cookie jar from next/headers - both need faking so resolveSession() never
// touches a real network/DB (there's no live Supabase project anyway).
const mockCookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
};
vi.mock('./supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('./demoSession', () => ({
  verifyDemoSession: vi.fn(),
}));

import {
  verifySession,
  getDashboardSession,
  isAdmin,
  isMentor,
  canEditData,
  canReadOnly,
  canManageAccount,
  type ResolvedSession,
} from './auth-server';
import { verifyDemoSession } from './demoSession';

function fakeProfileQuery(result: { data: any; error: any }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mockSupabase.from.mockReturnValue({ select });
  return { select, eq, single };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieStore.get.mockReturnValue(undefined);
});

describe('verifySession (API route gate: active-only)', () => {
  it('returns a 401 error when there is no authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await verifySession();
    expect('error' in result && result.status).toBe(401);
  });

  it('returns the session for an active user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    fakeProfileQuery({ data: { role: 'mentor', status: 'active', deleted_at: null }, error: null });

    const result = await verifySession();
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.profile.role).toBe('mentor');
      expect(result.isDemo).toBe(false);
    }
  });

  it('rejects a non-active status (suspended) with 403, even though the profile row was found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    fakeProfileQuery({ data: { role: 'team_member', status: 'suspended', deleted_at: null }, error: null });

    const result = await verifySession();
    expect('error' in result && result.status).toBe(403);
  });

  it('rejects when the profile row itself has deleted_at set', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    fakeProfileQuery({ data: { role: 'team_member', status: 'active', deleted_at: '2026-01-01' }, error: null });

    const result = await verifySession();
    expect('error' in result && result.status).toBe(403);
  });

  it('falls back to my_onboarding_status() RPC when no profile row is returned (applicant under RLS), and getDashboardSession resolves them without erroring', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u2', email: 'new@b.com' } }, error: null });
    fakeProfileQuery({ data: null, error: { message: 'no rows' } });
    mockSupabase.rpc.mockResolvedValue({ data: 'wait_approval', error: null });

    const result = await getDashboardSession();
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.profile.role).toBe('applicant');
      expect(result.profile.status).toBe('wait_approval');
    }
  });

  it('returns a 403 when there is truly no profile row and the RPC also returns nothing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u3', email: 'ghost@b.com' } }, error: null });
    fakeProfileQuery({ data: null, error: { message: 'no rows' } });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const result = await verifySession();
    expect('error' in result && result.status).toBe(403);
  });

  it('getDashboardSession resolves a suspended user successfully (no active-only gate) so the layout can render its status screen', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
    fakeProfileQuery({ data: { role: 'team_member', status: 'suspended', deleted_at: null }, error: null });

    const result = await getDashboardSession();
    expect('error' in result).toBe(false);
  });
});

describe('demo session cookie path', () => {
  it('accepts a validly-signed demo cookie when demo mode is enabled', async () => {
    process.env.NEXT_PUBLIC_DEMO_ENABLED = 'true';
    vi.resetModules();
    // Re-import after flipping the env var, since DEMO_ENABLED is computed
    // once at module load time.
    const authServer = await import('./auth-server');
    mockCookieStore.get.mockReturnValue({ value: 'signed-cookie-value' });
    vi.mocked(verifyDemoSession).mockResolvedValue({ email: 'mentor@demo.com', role: 'mentor', status: 'active' });

    const result = await authServer.getDashboardSession();
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.isDemo).toBe(true);
      expect(result.profile.role).toBe('mentor');
    }
    delete process.env.NEXT_PUBLIC_DEMO_ENABLED;
    vi.resetModules();
  });

  it('falls through to real auth when the demo cookie fails HMAC verification', async () => {
    process.env.NEXT_PUBLIC_DEMO_ENABLED = 'true';
    vi.resetModules();
    const authServer = await import('./auth-server');
    mockCookieStore.get.mockReturnValue({ value: 'tampered-cookie' });
    vi.mocked(verifyDemoSession).mockResolvedValue(null);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await authServer.getDashboardSession();
    expect('error' in result && result.status).toBe(401);
    delete process.env.NEXT_PUBLIC_DEMO_ENABLED;
    vi.resetModules();
  });
});

describe('role helpers (pure, operate on an already-resolved session)', () => {
  const session = (role: string): ResolvedSession => ({
    user: { id: 'u1', email: 'a@b.com' },
    profile: { role, status: 'active' },
    isDemo: false,
    supabaseClient: null,
  });

  it('isAdmin is true only for admin', () => {
    expect(isAdmin(session('admin'))).toBe(true);
    expect(isAdmin(session('mentor'))).toBe(false);
  });

  it('isMentor is true for admin and mentor (admin is a superset)', () => {
    expect(isMentor(session('admin'))).toBe(true);
    expect(isMentor(session('mentor'))).toBe(true);
    expect(isMentor(session('team_member'))).toBe(false);
  });

  it('canEditData / canReadOnly follow the EDIT_ROLES / READABLE_ROLES sets', () => {
    expect(canEditData(session('investigator'))).toBe(true);
    expect(canEditData(session('monitor'))).toBe(false); // oversight-only
    expect(canReadOnly(session('monitor'))).toBe(true);
    expect(canReadOnly(session('team_member'))).toBe(false);
  });

  it('canManageAccount: a plain mentor cannot touch an existing mentor/admin account', () => {
    expect(canManageAccount(session('mentor'), 'mentor')).toBe(false);
    expect(canManageAccount(session('mentor'), 'admin')).toBe(false);
    expect(canManageAccount(session('admin'), 'mentor')).toBe(true);
  });

  it('canManageAccount: only an admin can grant the admin role', () => {
    expect(canManageAccount(session('mentor'), 'team_member', 'admin')).toBe(false);
    expect(canManageAccount(session('admin'), 'team_member', 'admin')).toBe(true);
  });

  it('canManageAccount: a mentor can manage a non-mentor/admin account and grant non-admin roles', () => {
    expect(canManageAccount(session('mentor'), 'team_member')).toBe(true);
    expect(canManageAccount(session('mentor'), 'team_member', 'investigator')).toBe(true);
  });
});
