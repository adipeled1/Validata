import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/repositories/participants', () => ({ listParticipants: vi.fn() }));

import { GET } from './route';
import { verifySession } from '@/lib/auth-server';
import { listParticipants } from '@/lib/repositories/participants';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/participants', () => {
  it('propagates verifySession()\'s error status - any authenticated-but-not-active user is rejected here too', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Forbidden. Account status is suspended', status: 403 });
    const res = await GET(new Request('http://x/api/participants?study_id=s1'));
    expect(res.status).toBe(403);
  });

  it('passes study_id through to listParticipants() and returns its result', async () => {
    const session = { user: { id: 'u1', email: 'a@b.com' }, profile: { role: 'mentor', status: 'active' }, isDemo: true, supabaseClient: null };
    vi.mocked(verifySession).mockResolvedValue(session as any);
    vi.mocked(listParticipants).mockResolvedValue([{ id: 'P-1001' }] as any);

    const res = await GET(new Request('http://x/api/participants?study_id=s1'));
    expect(listParticipants).toHaveBeenCalledWith(session, 's1');
    expect(await res.json()).toEqual([{ id: 'P-1001' }]);
  });

  it('returns 500 with the error message when the repository throws', async () => {
    const session = { user: { id: 'u1', email: 'a@b.com' }, profile: { role: 'mentor', status: 'active' }, isDemo: false, supabaseClient: {} };
    vi.mocked(verifySession).mockResolvedValue(session as any);
    vi.mocked(listParticipants).mockRejectedValue(new Error('db exploded'));

    const res = await GET(new Request('http://x/api/participants?study_id=s1'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('db exploded');
  });
});
