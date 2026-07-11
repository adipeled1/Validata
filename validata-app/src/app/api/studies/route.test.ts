import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), isMentor: vi.fn() }));
vi.mock('@/lib/repositories/studies', () => ({ listStudies: vi.fn(), listDeletedStudies: vi.fn() }));

import { GET } from './route';
import { verifySession, isMentor } from '@/lib/auth-server';
import { listStudies, listDeletedStudies } from '@/lib/repositories/studies';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/studies', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/studies'));
    expect(res.status).toBe(401);
  });

  it('returns the active study list by default', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(listStudies).mockResolvedValue([{ id: 's1' }] as any);
    const res = await GET(new Request('http://x/api/studies'));
    expect(await res.json()).toEqual([{ id: 's1' }]);
    expect(listDeletedStudies).not.toHaveBeenCalled();
  });

  it('?deleted=true is mentor-only', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'investigator', status: 'active' } } as any);
    vi.mocked(isMentor).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/studies?deleted=true'));
    expect(res.status).toBe(403);
  });

  it('?deleted=true (mentor) returns the deleted-study list instead', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isMentor).mockReturnValue(true);
    vi.mocked(listDeletedStudies).mockResolvedValue([{ id: 's-deleted' }] as any);
    const res = await GET(new Request('http://x/api/studies?deleted=true'));
    expect(await res.json()).toEqual([{ id: 's-deleted' }]);
    expect(listStudies).not.toHaveBeenCalled();
  });
});
