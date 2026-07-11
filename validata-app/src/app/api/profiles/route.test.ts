import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  verifySession: vi.fn(),
  isMentor: vi.fn(),
  canManageAccount: vi.fn(),
}));
vi.mock('@/lib/demoStore', () => ({
  applyUserOverride: vi.fn((u: any) => u),
  setUserOverride: vi.fn(),
  deleteUserOverride: vi.fn(),
}));

import { GET, PATCH, DELETE } from './route';
import { verifySession, isMentor, canManageAccount } from '@/lib/auth-server';
import { setUserOverride, deleteUserOverride } from '@/lib/demoStore';
import { DEMO_USERS } from '@/lib/demoData';

const demoSession = {
  user: { id: 'demo-mentor-id', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/profiles', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/profiles'));
    expect(res.status).toBe(401);
  });

  it('?current=true (demo): returns only the caller\'s own role/status, not the full roster', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await GET(new Request('http://x/api/profiles?current=true'));
    const body = await res.json();
    expect(body).toEqual({ id: 'demo-mentor-id', email: 'mentor@demo.com', role: 'mentor', status: 'active' });
  });

  it('?activeOnly=true is gated to DELEGATION_ROLES', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'auditor', status: 'active' } } as any);
    const res = await GET(new Request('http://x/api/profiles?activeOnly=true'));
    expect(res.status).toBe(403);
  });

  it('?activeOnly=true (demo, sufficient role): returns only active users, id/email/role only', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await GET(new Request('http://x/api/profiles?activeOnly=true'));
    const body = await res.json();
    expect(body.every((u: any) => 'id' in u && 'email' in u && 'role' in u && !('status' in u))).toBe(true);
    // demo-deleted-id / demo-suspended-id / applicants should not appear
    expect(body.some((u: any) => u.id === 'demo-deleted-id')).toBe(false);
  });

  it('full roster requires isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'team_member', status: 'active' } } as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/profiles'));
    expect(res.status).toBe(403);
  });

  it('full roster (demo, mentor): returns every DEMO_USERS entry', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/profiles'));
    const body = await res.json();
    expect(body).toHaveLength(DEMO_USERS.length);
  });
});

describe('PATCH /api/profiles', () => {
  it('requires isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await PATCH(new Request('http://x/api/profiles', { method: 'PATCH', body: JSON.stringify({ id: 'x', status: 'active' }) }));
    expect(res.status).toBe(403);
  });

  it('rejects an invalid body (e.g. status: "deleted" - not allowed through this generic endpoint)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await PATCH(new Request('http://x/api/profiles', { method: 'PATCH', body: JSON.stringify({ id: 'x', status: 'deleted' }) }));
    expect(res.status).toBe(400);
  });

  it('demo mode: 404s for an unknown user id', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await PATCH(new Request('http://x/api/profiles', { method: 'PATCH', body: JSON.stringify({ id: 'no-such-user', status: 'active' }) }));
    expect(res.status).toBe(404);
  });

  it('demo mode: approving sets role + status together via one setUserOverride call', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(setUserOverride).mockReturnValue({ role: 'team_member', status: 'active' } as any);

    const res = await PATCH(new Request('http://x/api/profiles', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'demo-wait-approval-id', role: 'team_member', status: 'active' }),
    }));
    expect(res.status).toBe(200);
    expect(setUserOverride).toHaveBeenCalledTimes(1);
    expect(setUserOverride).toHaveBeenCalledWith(expect.objectContaining({ role: 'team_member', status: 'active' }));
  });

  it('live mode: blocks a plain mentor from managing an already-mentor/admin account', async () => {
    const single = vi.fn().mockResolvedValue({ data: { role: 'mentor' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(canManageAccount).mockReturnValue(false);

    const res = await PATCH(new Request('http://x/api/profiles', { method: 'PATCH', body: JSON.stringify({ id: 'target', status: 'suspended' }) }));
    expect(res.status).toBe(403);
  });

  it('live mode: clears deleted_at when reactivating a user to active', async () => {
    const single = vi.fn().mockResolvedValue({ data: { role: 'team_member' }, error: null });
    const selectEq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq: selectEq });

    const updateSelect = vi.fn().mockResolvedValue({ data: [{ id: 'target', status: 'active' }], error: null });
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select, update });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(canManageAccount).mockReturnValue(true);

    await PATCH(new Request('http://x/api/profiles', { method: 'PATCH', body: JSON.stringify({ id: 'target', status: 'active' }) }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', deleted_at: null }));
  });
});

describe('DELETE /api/profiles', () => {
  it('requires isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await DELETE(new Request('http://x/api/profiles?id=x', { method: 'DELETE' }));
    expect(res.status).toBe(403);
  });

  it('requires an id query param', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await DELETE(new Request('http://x/api/profiles', { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('demo mode: soft-deletes via deleteUserOverride (sets status: deleted, not a removal)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await DELETE(new Request('http://x/api/profiles?id=demo-team-id', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(deleteUserOverride).toHaveBeenCalledWith('demo-team-id', expect.any(String), 'mentor@demo.com');
  });

  it('live mode: hard-deletes via delete_candidate_user RPC for an applicant (never-approved account)', async () => {
    const single = vi.fn().mockResolvedValue({ data: { role: 'applicant', status: 'wait_approval' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const rpc = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from, rpc } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(canManageAccount).mockReturnValue(true);

    const res = await DELETE(new Request('http://x/api/profiles?id=applicant-id', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('delete_candidate_user', { p_user_id: 'applicant-id' });
  });

  it('live mode: soft-deletes (status: deleted) for an already-approved account, not the RPC path', async () => {
    const single = vi.fn().mockResolvedValue({ data: { role: 'team_member', status: 'active' }, error: null });
    const selectEq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq: selectEq });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select, update });
    const rpc = vi.fn();

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from, rpc } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(canManageAccount).mockReturnValue(true);

    const res = await DELETE(new Request('http://x/api/profiles?id=team-id', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'deleted' }));
  });
});
