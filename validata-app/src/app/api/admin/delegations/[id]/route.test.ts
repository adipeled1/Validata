import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ revokeDelegation: vi.fn(), completeDelegation: vi.fn() }));

import { PATCH } from './route';
import { verifySession } from '@/lib/auth-server';
import { revokeDelegation, completeDelegation } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'investigator@demo.com' },
  profile: { role: 'investigator', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

function patch(id: string, body: object) {
  return PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
}

describe('PATCH /api/admin/delegations/[id]', () => {
  it('rejects a non-numeric id', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await patch('not-a-number', { action: 'revoke' });
    expect(res.status).toBe(400);
  });

  it('requires action to be revoke or complete', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await patch('1', { action: 'made-up' });
    expect(res.status).toBe(400);
  });

  describe('revoke', () => {
    it('is gated by DELEGATION_ROLES', async () => {
      vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'auditor', status: 'active' } } as any);
      const res = await patch('1', { action: 'revoke' });
      expect(res.status).toBe(403);
    });

    it('demo mode: 404s when the delegation is not found or already closed', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(revokeDelegation).mockReturnValue(null);
      const res = await patch('1', { action: 'revoke' });
      expect(res.status).toBe(404);
    });

    it('demo mode: revokes via demoStore.revokeDelegation on success', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(revokeDelegation).mockReturnValue({ id: 1, revoked_at: '2026-07-11' } as any);
      const res = await patch('1', { action: 'revoke' });
      expect(res.status).toBe(200);
      expect(revokeDelegation).toHaveBeenCalledWith(1, 'investigator@demo.com');
    });
  });

  describe('complete', () => {
    it('is NOT limited to DELEGATION_ROLES - a site_coordinator can complete their own delegation', async () => {
      vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'site_coordinator', status: 'active' } } as any);
      vi.mocked(completeDelegation).mockReturnValue({ id: 1, completed_at: '2026-07-11' } as any);
      const res = await patch('1', { action: 'complete' });
      expect(res.status).toBe(200);
    });

    it('demo mode: 404s when the delegation is not found, not theirs, or already closed', async () => {
      vi.mocked(verifySession).mockResolvedValue(demoSession as any);
      vi.mocked(completeDelegation).mockReturnValue(null);
      const res = await patch('1', { action: 'complete' });
      expect(res.status).toBe(404);
    });
  });

  it('live mode: revoke updates via supabase with the delegator-scoped filters', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 1, revoked_at: '2026-07-11' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const is2 = vi.fn().mockReturnValue({ select });
    const is1 = vi.fn().mockReturnValue({ is: is2 });
    const eq = vi.fn().mockReturnValue({ is: is1 });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    const res = await patch('1', { action: 'revoke' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ revoked_by: 'u1' }));
  });
});
