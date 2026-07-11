import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), isMentor: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ setStudyLock: vi.fn(), getStudyLockOverride: vi.fn() }));

import { POST } from './route';
import { verifySession, isMentor } from '@/lib/auth-server';
import { setStudyLock, getStudyLockOverride } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('POST /api/admin/lock', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 's1', reason: 'r' }) }));
    expect(res.status).toBe(401);
  });

  it('is mentor-only', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'investigator', status: 'active' } } as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 's1', reason: 'r' }) }));
    expect(res.status).toBe(403);
  });

  it('requires a non-empty reason (schema-enforced)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 's1', reason: '' }) }));
    expect(res.status).toBe(400);
  });

  it('demo mode: 409s if the study is already locked, without calling setStudyLock', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(getStudyLockOverride).mockReturnValue({ lock_state: 'locked' } as any);

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 'demo-study-1', reason: 'r' }) }));
    expect(res.status).toBe(409);
    expect(setStudyLock).not.toHaveBeenCalled();
  });

  it('demo mode: locks via setStudyLock when not already locked', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(getStudyLockOverride).mockReturnValue(null);
    vi.mocked(setStudyLock).mockReturnValue({ lock_state: 'locked' } as any);

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 'demo-study-1', reason: 'audit' }) }));
    expect(res.status).toBe(200);
    expect(setStudyLock).toHaveBeenCalledWith(expect.objectContaining({ studyId: 'demo-study-1', locked: true, reason: 'audit' }));
  });

  it('live mode: rejects locking a soft-deleted study', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', lock_state: 'open', deleted_at: '2026-01-01' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 's1', reason: 'r' }) }));
    expect(res.status).toBe(400);
  });

  it('live mode: 409s when the study is already locked', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', lock_state: 'locked', deleted_at: null }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ studyId: 's1', reason: 'r' }) }));
    expect(res.status).toBe(409);
  });
});
