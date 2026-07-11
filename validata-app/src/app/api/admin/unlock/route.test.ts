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

function post(body: object) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/admin/unlock', () => {
  it('is mentor-only', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await post({ studyId: 's1', reason: 'r' });
    expect(res.status).toBe(403);
  });

  it('demo mode: 409s if the study is not currently locked', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(getStudyLockOverride).mockReturnValue(null);
    const res = await post({ studyId: 'demo-study-1', reason: 'r' });
    expect(res.status).toBe(409);
    expect(setStudyLock).not.toHaveBeenCalled();
  });

  it('demo mode: unlocks via setStudyLock(locked: false) when currently locked', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(getStudyLockOverride).mockReturnValue({ lock_state: 'locked' } as any);
    vi.mocked(setStudyLock).mockReturnValue({ lock_state: 'open' } as any);

    const res = await post({ studyId: 'demo-study-1', reason: 'resolved' });
    expect(res.status).toBe(200);
    expect(setStudyLock).toHaveBeenCalledWith(expect.objectContaining({ locked: false, reason: 'resolved' }));
  });

  it('live mode: 409s when the study is already open', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', lock_state: 'open' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await post({ studyId: 's1', reason: 'r' });
    expect(res.status).toBe(409);
  });

  it('live mode: 404s for an unknown study', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('not found') });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await post({ studyId: 'ghost', reason: 'r' });
    expect(res.status).toBe(404);
  });

  it('live mode: unlocks and clears locked_at/locked_by', async () => {
    const single1 = vi.fn().mockResolvedValue({ data: { id: 's1', lock_state: 'locked' }, error: null });
    const eq1 = vi.fn().mockReturnValue({ single: single1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    const single2 = vi.fn().mockResolvedValue({ data: { id: 's1', lock_state: 'open' }, error: null });
    const updateEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: single2 }) });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select: select1, update });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await post({ studyId: 's1', reason: 'resolved' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ lock_state: 'open', locked_at: null, locked_by: null }));
  });
});
