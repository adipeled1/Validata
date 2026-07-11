import { verifySession } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { mintSigningToken } from '@/lib/signing-tokens';
import { isRateLimited } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// POST /api/auth/verify-credentials
// Re-authenticates the current user with their password before a high-stakes action
// such as electronic signature (ICH E6(R3) SIG-01, SIG-02).
// Body: { email: string; password: string }
// Returns 200 OK + a short-lived signingToken if credentials are valid, 401 if not.
// The signingToken binds this call to the subsequent POST /api/signatures,
// and attempts are rate-limited per user so this endpoint can't be used as
// a password oracle.
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    if (isRateLimited(session.user.id, MAX_ATTEMPTS, WINDOW_MS)) {
      return Response.json(
        { error: 'Too many verification attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    // Demo mode: always succeed (no real credentials to verify)
    if (session.isDemo) {
      const signingToken = await mintSigningToken(session);
      return Response.json({ verified: true, signingToken });
    }

    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Verify that the supplied email matches the authenticated user
    if (email !== session.user.email) {
      return Response.json({ error: 'Email does not match authenticated user.' }, { status: 401 });
    }

    // Use a fresh Supabase client to attempt sign-in with the supplied credentials.
    // A successful sign-in confirms the user knows their password.
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const signingToken = await mintSigningToken(session);
    return Response.json({ verified: true, signingToken });
  } catch (error) {
    console.error('POST /api/auth/verify-credentials error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
