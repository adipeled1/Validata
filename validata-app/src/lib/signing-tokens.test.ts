import { describe, it, expect, vi } from 'vitest';
import { mintSigningToken, consumeSigningToken } from './signing-tokens';
import type { ResolvedSession } from './auth-server';

const demoSession: ResolvedSession = {
  user: { id: 'demo-user', email: 'mentor@demo.com' },
  profile: { role: 'mentor', status: 'active' },
  isDemo: true,
  supabaseClient: null,
};

describe('demo mode', () => {
  it('mintSigningToken returns the fixed demo token without touching Supabase', async () => {
    const token = await mintSigningToken(demoSession);
    expect(token).toBe('demo-signing-token');
  });

  it('consumeSigningToken accepts only the fixed demo token', async () => {
    expect(await consumeSigningToken(demoSession, 'demo-signing-token')).toBe(true);
    expect(await consumeSigningToken(demoSession, 'something-else')).toBe(false);
  });
});

describe('live mode', () => {
  function fakeSession(client: any): ResolvedSession {
    return {
      user: { id: 'live-user', email: 'mentor@live.com' },
      profile: { role: 'mentor', status: 'active' },
      isDemo: false,
      supabaseClient: client,
    };
  }

  it('mintSigningToken inserts a fresh token row and returns the generated token', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const token = await mintSigningToken(fakeSession({ from }));

    expect(from).toHaveBeenCalledWith('signing_tokens');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ token, user_id: 'live-user', purpose: 'signature' }));
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('mintSigningToken propagates a Supabase error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
    const from = vi.fn().mockReturnValue({ insert });
    await expect(mintSigningToken(fakeSession({ from }))).rejects.toThrow('insert failed');
  });

  it('consumeSigningToken returns false immediately for an empty token, without querying Supabase', async () => {
    const from = vi.fn();
    expect(await consumeSigningToken(fakeSession({ from }), '')).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it('consumeSigningToken returns true when the atomic update matches a row', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ token: 'tok-1' }], error: null });
    const gt = vi.fn().mockReturnValue({ select });
    const is = vi.fn().mockReturnValue({ gt });
    const eq2 = vi.fn().mockReturnValue({ is });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ update });

    const result = await consumeSigningToken(fakeSession({ from }), 'tok-1');
    expect(result).toBe(true);
    expect(eq1).toHaveBeenCalledWith('token', 'tok-1');
    expect(eq2).toHaveBeenCalledWith('user_id', 'live-user');
  });

  it('consumeSigningToken returns false when nothing matches (already consumed, expired, or wrong user)', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const gt = vi.fn().mockReturnValue({ select });
    const is = vi.fn().mockReturnValue({ gt });
    const eq2 = vi.fn().mockReturnValue({ is });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ update });

    expect(await consumeSigningToken(fakeSession({ from }), 'tok-1')).toBe(false);
  });
});
