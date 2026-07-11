import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), isMentor: vi.fn() }));

import { POST } from './route';
import { verifySession, isMentor } from '@/lib/auth-server';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('POST /api/admin/cleanup-candidates', () => {
  it("propagates verifySession()'s error status", async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it('demo mode: returns deleted:0 without calling supabase', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 0, demo: true });
  });

  it('live mode: calls the cleanup_expired_candidates RPC and returns its count', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { rpc } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await POST();
    expect(rpc).toHaveBeenCalledWith('cleanup_expired_candidates');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 3 });
  });

  it('live mode: surfaces an RPC error as a 500', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { rpc } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
