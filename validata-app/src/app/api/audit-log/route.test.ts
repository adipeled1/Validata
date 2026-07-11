import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ getAuditLog: vi.fn() }));

import { GET } from './route';
import { verifySession } from '@/lib/auth-server';
import { getAuditLog } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/audit-log', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/audit-log'));
    expect(res.status).toBe(401);
  });

  it('is restricted to AUDIT_VIEWER_ROLES - a site_coordinator is rejected', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'site_coordinator', status: 'active' } } as any);
    const res = await GET(new Request('http://x/api/audit-log'));
    expect(res.status).toBe(403);
  });

  it('demo mode: returns JSON rows from demoStore.getAuditLog by default', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(getAuditLog).mockReturnValue([{ id: 'AUD-1', occurred_at: '2026-07-11T00:00:00Z', actor_email: 'a@b.com', table_name: 'studies', record_id: 's1', action: 'LOCK', reason: null, study_id: 's1' }] as any);

    const res = await GET(new Request('http://x/api/audit-log?studyId=s1'));
    expect(getAuditLog).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1' }));
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('demo mode: format=csv returns a CSV response with the right content type/filename', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(getAuditLog).mockReturnValue([
      { id: 'AUD-1', occurred_at: '2026-07-11T00:00:00Z', actor_email: 'a@b.com', table_name: 'studies', record_id: 's1', action: 'LOCK', reason: 'a "quoted" reason', study_id: 's1' },
    ] as any);

    const res = await GET(new Request('http://x/api/audit-log?format=csv'));
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('audit-trail.csv');
    const text = await res.text();
    expect(text).toContain('id,occurred_at,actor_email,table_name,record_id,action,reason,study_id');
    expect(text).toContain('""quoted""'); // embedded quotes doubled per CSV escaping
  });

  it('live mode: applies studyId/actor/action/from/to filters to the query builder', async () => {
    const from = vi.fn();

    // Supabase's query builder is thenable (awaiting it resolves to
    // { data, error }), so `builder` needs its own `then` alongside the
    // chainable eq/gte/lte methods each returning itself.
    const queryResult = Promise.resolve({ data: [{ id: 1 }], error: null });
    const builder: any = {
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      then: (resolve: any) => queryResult.then(resolve),
    };
    from.mockReturnValue({ select: () => ({ order: () => ({ limit: () => builder }) }) });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);

    const res = await GET(new Request('http://x/api/audit-log?studyId=s1&actor=u1&action=LOCK&from=2026-01-01&to=2026-12-31'));
    expect(res.status).toBe(200);
    expect(builder.eq).toHaveBeenCalledWith('study_id', 's1');
    expect(builder.eq).toHaveBeenCalledWith('actor_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('action', 'LOCK');
    expect(builder.gte).toHaveBeenCalledWith('occurred_at', '2026-01-01');
    expect(builder.lte).toHaveBeenCalledWith('occurred_at', '2026-12-31');
  });
});
