import { verifySession } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth/verify-credentials
// Re-authenticates the current user with their password before a high-stakes action
// such as electronic signature (ICH E6(R3) SIG-01, SIG-02).
// Body: { email: string; password: string }
// Returns 200 OK if credentials are valid, 401 if not.
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await verifySession();
    if ('error' in session) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    // Demo mode: always succeed (no real credentials to verify)
    if (session.isDemo) {
      return Response.json({ verified: true });
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

    return Response.json({ verified: true });
  } catch (error) {
    console.error('POST /api/auth/verify-credentials error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
