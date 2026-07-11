import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), canReadOnly: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ addQuery: vi.fn(), getQueries: vi.fn() }));

import { GET, POST } from './route';
import { verifySession, canReadOnly } from '@/lib/auth-server';
import { addQuery, getQueries } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/queries', () => {
  it('is gated by canReadOnly()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/queries?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('requires studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/queries'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns demoStore.getQueries(studyId)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    vi.mocked(getQueries).mockReturnValue([{ id: 1 }] as any);
    const res = await GET(new Request('http://x/api/queries?studyId=s1'));
    expect(getQueries).toHaveBeenCalledWith('s1');
    expect(await res.json()).toEqual([{ id: 1 }]);
  });
});

describe('POST /api/queries', () => {
  function post(body: object) {
    return POST(new Request('http://x/api/queries', { method: 'POST', body: JSON.stringify(body) }));
  }

  it('is gated by QUERY_MUTATE_ROLES - auditor is rejected even though it can read', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'auditor', status: 'active' } } as any);
    const res = await post({ studyId: 's1', recordTable: 'participants', recordId: 'P-1', fieldName: 'age', queryText: 'why?' });
    expect(res.status).toBe(403);
  });

  it('validates the body', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await post({ studyId: 's1' });
    expect(res.status).toBe(400);
    expect(addQuery).not.toHaveBeenCalled();
  });

  it('demo mode: creates the query via demoStore.addQuery and returns 201', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(addQuery).mockReturnValue({ id: 1 } as any);
    const res = await post({ studyId: 's1', recordTable: 'participants', recordId: 'P-1', fieldName: 'age', queryText: 'why?' });
    expect(res.status).toBe(201);
    expect(addQuery).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1', fieldName: 'age', raisedBy: 'mentor@demo.com' }));
  });
});
