import type { ResolvedSession } from '@/lib/auth-server';

// Binds POST /api/auth/verify-credentials to POST /api/signatures so a
// signature can never be recorded without a preceding, successful password
// re-check. A token is minted only after verify-credentials succeeds, is
// single-use, and expires quickly.

const TOKEN_TTL_MS = 3 * 60 * 1000; // 3 minutes
const DEMO_TOKEN = 'demo-signing-token';

export async function mintSigningToken(session: ResolvedSession): Promise<string> {
  if (session.isDemo) {
    // Demo mode has no DB to persist a token against; mirrors the rest of
    // the demo bypass pattern used throughout the repositories.
    return DEMO_TOKEN;
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await session.supabaseClient!
    .from('signing_tokens')
    .insert({ token, user_id: session.user.id, purpose: 'signature', expires_at: expiresAt });

  if (error) throw error;
  return token;
}

// Atomically claims a token: the UPDATE's WHERE clause re-checks
// consumed_at/expires_at at execution time under RLS, so if two requests
// race to consume the same token, only one UPDATE actually matches a row.
export async function consumeSigningToken(session: ResolvedSession, token: string): Promise<boolean> {
  if (session.isDemo) {
    return token === DEMO_TOKEN;
  }

  if (!token) return false;

  const { data, error } = await session.supabaseClient!
    .from('signing_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', token)
    .eq('user_id', session.user.id)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token');

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
