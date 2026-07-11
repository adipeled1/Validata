import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), isMentor: vi.fn() }));

import { GET, POST, DELETE } from './route';
import { verifySession, isMentor } from '@/lib/auth-server';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/study-members', () => {
  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/admin/study-members'));
    expect(res.status).toBe(403);
  });

  it('demo mode: filters DEMO_MEMBERS by studyId when provided', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/study-members?studyId=demo-study-1'));
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('demo mode: returns all members when studyId is omitted', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/study-members'));
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('live mode: applies the studyId filter only when provided', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ study_id: 's1' }], error: null });
    const eq = vi.fn().mockReturnValue(Promise.resolve({ data: [{ study_id: 's1' }], error: null }));
    const select = vi.fn().mockReturnValue({ order: () => ({ eq }) });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/study-members?studyId=s1'));
    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('study_id', 's1');
  });
});

describe('POST /api/admin/study-members', () => {
  function post(body: object) {
    return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
  }

  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await post({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('requires studyId and userId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post({ studyId: 's1' });
    expect(res.status).toBe(400);
  });

  it('demo mode: returns a stub member without calling supabase', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(201);
  });

  it('live mode: 404s when the target profile does not exist', async () => {
    const single = vi.fn().mockResolvedValue({ data: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(404);
  });

  it('live mode: rejects non-active target profiles', async () => {
    const single = vi.fn().mockResolvedValue({ data: { role: 'data_manager', status: 'suspended' } });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await post({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(400);
  });

  it('live mode: inserts a study_members row snapshotting the current profile role', async () => {
    const profileSingle = vi.fn().mockResolvedValue({ data: { role: 'data_manager', status: 'active' } });
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle });
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

    const insertSingle = vi.fn().mockResolvedValue({ data: { study_id: 's1', user_id: 'u2', study_role: 'data_manager' }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    const from = vi.fn((table: string) => (table === 'profiles' ? { select: profileSelect } : { insert }));
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await post({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ study_id: 's1', user_id: 'u2', study_role: 'data_manager' }));
  });
});

describe('DELETE /api/admin/study-members', () => {
  function del(body: object) {
    return DELETE(new Request('http://x', { method: 'DELETE', body: JSON.stringify(body) }));
  }

  it('is gated by isMentor()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await del({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('requires studyId and userId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await del({ studyId: 's1' });
    expect(res.status).toBe(400);
  });

  it('demo mode: returns success without calling supabase', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await del({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('live mode: 404s when the target profile does not exist', async () => {
    const single = vi.fn().mockResolvedValue({ data: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);
    const res = await del({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(404);
  });

  it('live mode: deletes the study_members row', async () => {
    const profileSingle = vi.fn().mockResolvedValue({ data: { status: 'active' } });
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle });
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });

    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq1 });

    const from = vi.fn((table: string) => (table === 'profiles' ? { select: profileSelect } : { delete: deleteFn }));
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(isMentor).mockReturnValue(true);

    const res = await del({ studyId: 's1', userId: 'u2' });
    expect(res.status).toBe(200);
    expect(deleteEq1).toHaveBeenCalledWith('study_id', 's1');
    expect(deleteEq2).toHaveBeenCalledWith('user_id', 'u2');
  });
});
