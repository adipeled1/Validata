import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAnalysisData } from './service';

describe('fetchAnalysisData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs to /api/measurements with type=analysis, the threshold, and studyId (not raw participant/measurement data)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAnalysisData(3, 'study-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/measurements', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ type: 'analysis', threshold: 3, studyId: 'study-1' });
    expect(result).toEqual({ ok: true });
  });
});
