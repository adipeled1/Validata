import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn(), canReadOnly: vi.fn() }));
vi.mock('@/lib/signing-tokens', () => ({ consumeSigningToken: vi.fn() }));
vi.mock('@/lib/demoStore', () => ({ addSignature: vi.fn(), getSignatures: vi.fn() }));

import { GET, POST } from './route';
import { verifySession, canReadOnly } from '@/lib/auth-server';
import { consumeSigningToken } from '@/lib/signing-tokens';
import { addSignature, getSignatures } from '@/lib/demoStore';

const demoSession = {
  user: { id: 'u1', email: 'investigator@demo.com' },
  profile: { role: 'investigator', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => vi.clearAllMocks());

describe('POST /api/signatures', () => {
  function post(body: object) {
    return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
  }
  const validBody = { studyId: 's1', recordType: 'study', recordId: 's1', milestone: 'data_lock', meaning: 'I confirm', signingToken: 'tok-1' };

  it('is gated by SIGNING_ROLES', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, profile: { role: 'data_manager', status: 'active' } } as any);
    const res = await post(validBody);
    expect(res.status).toBe(403);
  });

  it('rejects when the signing token fails to consume (expired/reused/invalid)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(consumeSigningToken).mockResolvedValue(false);
    const res = await post(validBody);
    expect(res.status).toBe(401);
    expect(addSignature).not.toHaveBeenCalled();
  });

  it('demo mode: records the signature via demoStore.addSignature once the token is valid', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(consumeSigningToken).mockResolvedValue(true);
    vi.mocked(addSignature).mockReturnValue({ id: 1, signed_at: '2026-07-11T00:00:00Z' } as any);

    const res = await post(validBody);
    expect(res.status).toBe(201);
    expect(addSignature).toHaveBeenCalledWith(expect.objectContaining({ studyId: 's1', milestone: 'data_lock' }));
  });
});

describe('GET /api/signatures', () => {
  it('is gated by canReadOnly()', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(false);
    const res = await GET(new Request('http://x/api/signatures?studyId=s1'));
    expect(res.status).toBe(403);
  });

  it('requires studyId', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    const res = await GET(new Request('http://x/api/signatures'));
    expect(res.status).toBe(400);
  });

  it('demo mode: returns demoStore.getSignatures(studyId)', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(canReadOnly).mockReturnValue(true);
    vi.mocked(getSignatures).mockReturnValue([{ id: 1 }] as any);
    const res = await GET(new Request('http://x/api/signatures?studyId=s1'));
    expect(getSignatures).toHaveBeenCalledWith('s1');
    expect(await res.json()).toEqual([{ id: 1 }]);
  });
});
