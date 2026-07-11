import { signDemoSession } from '@/lib/demoSession';

// POST /api/auth/demo-login
// Demo mode fails closed by design, since a client-writable, unsigned
// `demo-session` cookie would let anyone forge "admin" access via dev tools
// regardless of whether Supabase was configured. So:
//   1. Demo mode is opt-in (NEXT_PUBLIC_DEMO_ENABLED must be exactly 'true').
//   2. Credentials are checked here, server-side, against a fixed demo list.
//   3. The cookie is HMAC-signed (DEMO_SESSION_SECRET) so it can't be forged
//      or have its role tampered with; proxy.ts and auth-server.ts verify
//      the signature before trusting it.
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true';

const DEMO_ACCOUNTS: Record<string, { password: string; role: string }> = {
  'mentor@demo.com': { password: 'demo123', role: 'mentor' },
  'team@demo.com': { password: 'demo123', role: 'team_member' },
  'investigator@demo.com': { password: 'demo123', role: 'investigator' },
};

export async function POST(request: Request): Promise<Response> {
  if (!DEMO_ENABLED) {
    return Response.json({ error: 'Demo mode is disabled.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    const account = DEMO_ACCOUNTS[email];
    if (!account || account.password !== password) {
      return Response.json({ error: 'Invalid demo credentials.' }, { status: 401 });
    }

    const cookieValue = await signDemoSession({ email, role: account.role, status: 'active' });
    if (!cookieValue) {
      // DEMO_SESSION_SECRET is missing - fail closed rather than issuing an
      // unsigned/guessable session.
      console.error('DEMO_SESSION_SECRET is not set; refusing to issue a demo session.');
      return Response.json({ error: 'Demo mode is misconfigured.' }, { status: 500 });
    }

    const response = Response.json({ success: true, role: account.role, email });
    const isProd = process.env.NODE_ENV === 'production';
    response.headers.append(
      'Set-Cookie',
      `demo-session=${cookieValue}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict; HttpOnly${isProd ? '; Secure' : ''}`
    );
    return response;
  } catch (error) {
    console.error('POST /api/auth/demo-login error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
