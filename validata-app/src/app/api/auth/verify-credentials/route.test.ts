import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-server', () => ({ verifySession: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/signing-tokens', () => ({ mintSigningToken: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ isRateLimited: vi.fn() }));

import { POST } from './route';
import { verifySession } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { mintSigningToken } from '@/lib/signing-tokens';
import { isRateLimited } from '@/lib/rate-limit';

const demoSession = {
  user: { id: 'u1', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockReturnValue(false);
});

function post(body: object) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/auth/verify-credentials', () => {
  it('propagates verifySession()\'s error status', async () => {
    vi.mocked(verifySession).mockResolvedValue({ error: 'Unauthorized.', status: 401 });
    const res = await post({ email: 'x', password: 'y' });
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate-limited, before touching credentials', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(isRateLimited).mockReturnValue(true);
    const res = await post({ email: 'mentor@demo.com', password: 'x' });
    expect(res.status).toBe(429);
  });

  it('demo mode: always succeeds without checking a password', async () => {
    vi.mocked(verifySession).mockResolvedValue(demoSession as any);
    vi.mocked(mintSigningToken).mockResolvedValue('demo-signing-token');
    const res = await post({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, signingToken: 'demo-signing-token' });
  });

  it('live mode: requires both email and password', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false } as any);
    const res = await post({ email: 'mentor@live.com' });
    expect(res.status).toBe(400);
  });

  it('live mode: rejects when the supplied email does not match the authenticated user', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, user: { id: 'u1', email: 'real@live.com' } } as any);
    const res = await post({ email: 'spoofed@live.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('live mode: rejects an invalid password (signInWithPassword returns an error)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, user: { id: 'u1', email: 'real@live.com' } } as any);
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('bad password') }) },
    } as any);
    const res = await post({ email: 'real@live.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('live mode: succeeds and mints a signing token when the password re-check passes', async () => {
    vi.mocked(verifySession).mockResolvedValue({ ...demoSession, isDemo: false, user: { id: 'u1', email: 'real@live.com' } } as any);
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) },
    } as any);
    vi.mocked(mintSigningToken).mockResolvedValue('live-token');

    const res = await post({ email: 'real@live.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true, signingToken: 'live-token' });
  });
});
