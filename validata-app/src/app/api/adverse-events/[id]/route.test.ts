import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), canEditData: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ updateAdverseEvent: vi.fn() }));

import { PATCH } from './route';
import { verifySession, canEditData } from '@/lib/auth-server';
import { updateAdverseEvent } from '@/lib/demoStore';

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

describe('PATCH /api/adverse-events/[id]', () => {
  it('is gated by canEditData()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canEditData).mockReturnValue(false);
    const res = await patch('1', { outcome: 'recovered' });
    expect(res.status).toBe(403);
  });

  it('validates the outcome enum', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canEditData).mockReturnValue(true);
    const res = await patch('1', { outcome: 'made-up' });
    expect(res.status).toBe(400);
  });

  it('demo mode: 404s when the AE does not exist', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canEditData).mockReturnValue(true);
    vi.mocked(updateAdverseEvent).mockReturnValue(null);
    const res = await patch('AE-999', { outcome: 'recovered' });
    expect(res.status).toBe(404);
  });

  it('demo mode: updates via demoStore.updateAdverseEvent on success', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canEditData).mockReturnValue(true);
    vi.mocked(updateAdverseEvent).mockReturnValue({ id: 'AE-1', outcome: 'recovered' } as any);
    const res = await patch('AE-1', { outcome: 'recovered' });
    expect(res.status).toBe(200);
    expect(updateAdverseEvent).toHaveBeenCalledWith('AE-1', expect.objectContaining({ outcome: 'recovered', actorEmail: 'mentor@demo.com' }));
  });

  it('live mode: rejects a non-numeric id', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false } as any);
    vi.mocked(canEditData).mockReturnValue(true);
    const res = await patch('not-a-number', { outcome: 'recovered' });
    expect(res.status).toBe(400);
  });

  it('live mode: only includes fields that were actually provided', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 1, outcome: 'recovered' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, supabaseClient: { from } } as any);
    vi.mocked(canEditData).mockReturnValue(true);

    const res = await patch('1', { outcome: 'recovered' });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ outcome: 'recovered' });
  });
});
