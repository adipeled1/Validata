import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  verifySession: vi.fn(),
  canEditData: vi.fn(),
  canReadOnly: vi.fn(),
}));
vi.mock('@/lib/demoStore', () => ({
  addAdverseEvent: vi.fn(),
  getAdverseEvents: vi.fn(),
}));

import { GET, POST } from './route';
import { verifySession, canEditData, canReadOnly } from '@/lib/auth-server';
import { addAdverseEvent, getAdverseEvents } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/adverse-events', () => {
  it('is gated by canReadOnly()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/adverse-events?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('requires studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/adverse-events'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns demoStore.getAdverseEvents(studyId)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    vi.mocked(getAdverseEvents).mockReturnValue([{ id: 1 }] as any);
    const res = await GET(new Request('http://x/api/adverse-events?studyId=s1'));
    expect(await res.json()).toEqual([{ id: 1 }]);
    expect(getAdverseEvents).toHaveBeenCalledWith('s1');
  });
});

describe('POST /api/adverse-events (authority deadline calculation - ICH E2A)', () => {
  function post(body: object) {
    return POST(new Request('http://x/api/adverse-events', { method: 'POST', body: JSON.stringify(body) }));
  }

  beforeEach(() => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canEditData).mockReturnValue(true);
    vi.mocked(addAdverseEvent).mockImplementation((input: any) => input as any);
  });

  it('is gated by canEditData()', async () => {
    vi.mocked(canEditData).mockReturnValue(false);
    const res = await post({ studyId: 's1', participantId: 'P-1', description: 'x', severity: 'mild', causality: 'possible', reportDate: '2026-07-11' });
    expect(res.status).toBe(403);
  });

  it('a plain "ae" (not sae/susar) gets no authority deadline regardless of severity', async () => {
    await post({
      studyId: 's1', participantId: 'P-1', aeType: 'ae', description: 'x',
      severity: 'fatal', causality: 'possible', expectedness: 'unexpected', reportDate: '2026-07-11',
    });
    expect(addAdverseEvent).toHaveBeenCalledWith(expect.objectContaining({ authorityDeadline: null }));
  });

  it('an expected event gets no deadline even if fatal/unexpected-severity', async () => {
    await post({
      studyId: 's1', participantId: 'P-1', aeType: 'sae', description: 'x',
      severity: 'fatal', causality: 'possible', expectedness: 'expected', reportDate: '2026-07-11',
    });
    expect(addAdverseEvent).toHaveBeenCalledWith(expect.objectContaining({ authorityDeadline: null }));
  });

  it('a fatal/life-threatening + unexpected SAE gets a 7-day deadline', async () => {
    await post({
      studyId: 's1', participantId: 'P-1', aeType: 'sae', description: 'x',
      severity: 'fatal', causality: 'possible', expectedness: 'unexpected', reportDate: '2026-07-11',
    });
    expect(addAdverseEvent).toHaveBeenCalledWith(expect.objectContaining({ authorityDeadline: '2026-07-18' }));
  });

  it('a moderate + unexpected SAE gets a 15-day deadline', async () => {
    await post({
      studyId: 's1', participantId: 'P-1', aeType: 'sae', description: 'x',
      severity: 'moderate', causality: 'possible', expectedness: 'unexpected', reportDate: '2026-07-11',
    });
    expect(addAdverseEvent).toHaveBeenCalledWith(expect.objectContaining({ authorityDeadline: '2026-07-26' }));
  });

  it('rejects a body missing required fields (schema validation)', async () => {
    const res = await post({ studyId: 's1', participantId: 'P-1' });
    expect(res.status).toBe(400);
    expect(addAdverseEvent).not.toHaveBeenCalled();
  });
});
