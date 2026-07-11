import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), canReadOnly: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ addDelegation: vi.fn(), getDelegations: vi.fn() }));

import { GET, POST } from './route';
import { verifySession, canReadOnly } from '@/lib/auth-server';
import { addDelegation, getDelegations } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'investigator@demo.com' },
  profile: { role: 'investigator', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/delegations', () => {
  it('is gated by canReadOnly()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/admin/delegations?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('requires studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/admin/delegations'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns demoStore.getDelegations(studyId)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    vi.mocked(getDelegations).mockReturnValue([{ id: 1 }] as any);
    const res = await GET(new Request('http://x/api/admin/delegations?studyId=s1'));
    expect(getDelegations).toHaveBeenCalledWith('s1');
    expect(await res.json()).toEqual([{ id: 1 }]);
  });
});

describe('POST /api/admin/delegations', () => {
  function post(body: object) {
    return POST(new Request('http://x/api/admin/delegations', { method: 'POST', body: JSON.stringify(body) }));
  }
  const validBody = { studyId: 's1', delegatedTo: 'u2', taskDescription: 'measure', effectiveFrom: '2026-01-01' };

  it('is gated by DELEGATION_ROLES', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'auditor', status: 'active' } } as any);
    const res = await post(validBody);
    expect(res.status).toBe(403);
  });

  it('validates required fields', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await post({ studyId: 's1' });
    expect(res.status).toBe(400);
    expect(addDelegation).not.toHaveBeenCalled();
  });

  it('demo mode: creates via demoStore.addDelegation and returns 201', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(addDelegation).mockReturnValue({ id: 1 } as any);
    const res = await post(validBody);
    expect(res.status).toBe(201);
    expect(addDelegation).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1', delegatedBy: 'investigator@demo.com' }));
  });
});
