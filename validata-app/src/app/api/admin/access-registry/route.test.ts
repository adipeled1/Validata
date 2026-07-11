import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));

import { GET } from './route';
import { verifySession } from '@/lib/auth-server';

const demoSession = {
  user: { id: 'u1', email: 'admin@demo.com' },
  profile: { role: 'admin', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/access-registry', () => {
  it("propagates verifySession()'s error status", async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await GET(new Request('http://x/api/admin/access-registry'));
    expect(res.status).toBe(401);
  });

  it('is restricted to ACCESS_REGISTRY_ROLES - a site_coordinator is rejected', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'site_coordinator', status: 'active' } } as any);
    const res = await GET(new Request('http://x/api/admin/access-registry'));
    expect(res.status).toBe(403);
  });

  it('demo mode: returns an empty array', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    const res = await GET(new Request('http://x/api/admin/access-registry'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('live mode: returns profiles as JSON by default', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'p1', email: 'a@b.com', role: 'admin', status: 'active', created_at: '2026-01-01', deleted_at: null }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    const res = await GET(new Request('http://x/api/admin/access-registry'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('live mode: format=csv returns a CSV response with the right content type/filename', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'p1', email: 'a@b.com', role: 'admin', status: 'active', created_at: '2026-01-01', deleted_at: null }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    const res = await GET(new Request('http://x/api/admin/access-registry?format=csv'));
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('access-registry.csv');
    const text = await res.text();
    expect(text).toContain('id,email,role,status,created_at,deleted_at');
    expect(text).toContain('p1,a@b.com,admin,active,2026-01-01,');
  });
});
