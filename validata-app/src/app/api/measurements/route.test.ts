import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/repositories/measurements', () => ({ listMeasurements: vi.fn() }));
vi.mock('@/lib/repositories/participants', () => ({ listParticipants: vi.fn() }));
vi.mock('@/lib/mappers', () => ({ mapParticipants: vi.fn((x) => x), mapMeasurements: vi.fn((x) => x) }));
vi.mock('./analysisData', () => ({ default: { fake: 'demo-fallback-data' } }));
vi.mock('./statistics', () => ({
  normalizeRecord: vi.fn((m: any) => m),
  aggregateByParticipant: vi.fn(() => []),
  calculateDescriptiveStats: vi.fn(() => ({ n: 0, mean: 0, sd: 0, se: 0 })),
  calculateRMSE: vi.fn(() => 0),
  calculateMAE: vi.fn(() => 0),
  calculateBlandAltman: vi.fn(() => ({ meanDiff: 0, upperLimit: 0, lowerLimit: 0 })),
  calculatePassRate: vi.fn(() => ({ pass: 0, fail: 0, percentage: 0 })),
  binDifferences: vi.fn(() => []),
  calculateRMSEPerSession: vi.fn(() => []),
  getDifferences: vi.fn(() => []),
  getProgressChartData: vi.fn(() => []),
  getStatusChartData: vi.fn(() => []),
  generateAnalysisText: vi.fn(() => 'analysis text'),
}));

import { GET, POST } from './route';
import { verifySession } from '@/lib/auth-server';
import { listMeasurements } from '@/lib/repositories/measurements';
import { listParticipants } from '@/lib/repositories/participants';
import { aggregateByParticipant } from './statistics';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/measurements', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/measurements?study_id=s1'));
    expect(res.status).toBe(401);
  });

  it('passes study_id through to listMeasurements()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(listMeasurements).mockResolvedValue([{ id: 1 }] as any);
    const res = await GET(new Request('http://x/api/measurements?study_id=s1'));
    expect(listMeasurements).toHaveBeenCalledWith(demoSession, 's1');
    expect(await res.json()).toEqual([{ id: 1 }]);
  });
});

describe('POST /api/measurements (analysis calculation)', () => {
  function post(body: object) {
    return POST(new Request('http://x/api/measurements', { method: 'POST', body: JSON.stringify(body) }));
  }

  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await post({ studyId: 's1' });
    expect(res.status).toBe(401);
  });

  it('rejects a body missing studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('fetches participants/measurements scoped to the given studyId and returns the computed shape', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(listParticipants).mockResolvedValue([{ id: 'P-1', status: 'Active' }] as any);
    vi.mocked(listMeasurements).mockResolvedValue([{ id: 1, isValid: true }] as any);

    const res = await post({ studyId: 's1', threshold: 3 });
    expect(res.status).toBe(200);
    expect(listParticipants).toHaveBeenCalledWith(demoSession, 's1');
    expect(listMeasurements).toHaveBeenCalledWith(demoSession, 's1');

    const body = await res.json();
    expect(body).toHaveProperty('summaryStats');
    expect(body).toHaveProperty('charts.blandAltman');
    expect(body).toHaveProperty('charts.thresholdDonut.threshold', 3);
  });

  it('demo mode with zero real measurements falls back to the bundled analysisData sample', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(listParticipants).mockResolvedValue([] as any);
    vi.mocked(listMeasurements).mockResolvedValue([] as any);

    await post({ studyId: 's1' });
    // aggregateByParticipant receives whatever normalizedData ended up being -
    // the demo-fallback sample, not an empty array, when isDemo && no real measurements.
    expect(aggregateByParticipant).toHaveBeenCalledWith({ fake: 'demo-fallback-data' });
  });

  it('live mode with zero measurements does not use the demo fallback (aggregates an empty array)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false } as any);
    vi.mocked(listParticipants).mockResolvedValue([] as any);
    vi.mocked(listMeasurements).mockResolvedValue([] as any);

    await post({ studyId: 's1' });
    expect(aggregateByParticipant).toHaveBeenCalledWith([]);
  });
});
