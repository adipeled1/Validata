import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ updateQuery: vi.fn() }));

import { PATCH } from './route';
import { verifySession } from '@/lib/auth-server';
import { updateQuery } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

function patch(id: string, body: object) {
  return PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
}

describe('PATCH /api/queries/[id]', () => {
  it('is gated by QUERY_MUTATE_ROLES', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'irb_reviewer', status: 'active' } } as any);
    const res = await patch('1', { status: 'resolved' });
    expect(res.status).toBe(403);
  });

  it('rejects a non-numeric id', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await patch('not-a-number', { status: 'resolved' });
    expect(res.status).toBe(400);
  });

  it('validates the body status enum', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await patch('1', { status: 'made-up-status' });
    expect(res.status).toBe(400);
  });

  it('demo mode: 404s when the query does not exist', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(updateQuery).mockReturnValue(null);
    const res = await patch('999', { status: 'resolved' });
    expect(res.status).toBe(404);
  });

  it('demo mode: updates via demoStore.updateQuery on success', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(updateQuery).mockReturnValue({ id: 1, status: 'answered' } as any);
    const res = await patch('1', { status: 'answered', answerText: 'looks fine' });
    expect(res.status).toBe(200);
    expect(updateQuery).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'answered', answerText: 'looks fine' }));
  });

  it('live mode: stamps the right actor/timestamp fields per status', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 1, status: 'closed' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);

    const res = await patch('1', { status: 'closed' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed', closed_by: 'u1' }));
  });
});
