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

function post(body: object) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
}

const validBody = { studyId: 's1', reason: 'retention period elapsed' };

describe('POST /api/admin/destruction-request', () => {
  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await post(validBody);
    expect(res.status).toBe(403);
  });

  it('validates the body (reason required)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post({ studyId: 's1', reason: '' });
    expect(res.status).toBe(400);
  });

  it('demo mode: returns a success payload without calling supabase', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'destruction_requested', study_id: 's1' });
  });

  it('live mode: 404s when the study is not found', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(res.status).toBe(404);
  });

  it('live mode: rejects a study that is not soft-deleted', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', deleted_at: null, retention_hold: false, created_at: '2000-01-01' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/soft-deleted/);
  });

  it('live mode: rejects a study under retention hold', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', deleted_at: '2000-01-01', retention_hold: true, created_at: '2000-01-01' }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/retention hold/);
  });

  it('live mode: rejects a study younger than the minimum retention period', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', deleted_at: '2026-01-01', retention_hold: false, created_at: new Date().toISOString() }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least 15 years/);
  });

  it('live mode: records the destruction request once eligibility checks pass', async () => {
    const oldCreatedAt = new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
    const single = vi.fn().mockResolvedValue({ data: { id: 's1', deleted_at: '2026-01-01', retention_hold: false, created_at: oldCreatedAt }, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from, rpc } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post(validBody);
    expect(rpc).toHaveBeenCalledWith('record_destruction_request', { p_study_id: 's1', p_reason: validBody.reason });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
