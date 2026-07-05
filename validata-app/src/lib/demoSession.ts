// Signs and verifies the `demo-session` cookie so demo mode fails closed
// (fable_system_review §6.1): the cookie payload is no longer trusted
// unsigned client JSON with an attacker-chosen role. Uses Web Crypto
// (available in both the Edge middleware runtime and Node) instead of
// node:crypto so the same code runs in src/proxy.ts and auth-server.ts.

export type DemoSessionPayload = {
  email: string;
  role: string;
  status: 'active';
};

// A secret is required to sign/verify. In production this must come from
// DEMO_SESSION_SECRET; if it's missing, signing/verification both fail
// closed (no demo session can ever be created or accepted) rather than
// falling back to a guessable default.
function getSecret(): string | null {
  return process.env.DEMO_SESSION_SECRET || null;
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Buffer.from(signature).toString('base64url');
}

// Cookie value shape: base64url(JSON payload) + '.' + base64url(HMAC signature)
export async function signDemoSession(payload: DemoSessionPayload): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = await hmac(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyDemoSession(cookieValue: string): Promise<DemoSessionPayload | null> {
  const secret = getSecret();
  if (!secret) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  const expectedSignature = await hmac(secret, encodedPayload);
  if (expectedSignature !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (typeof payload?.email !== 'string' || typeof payload?.role !== 'string') return null;
    return { email: payload.email, role: payload.role, status: 'active' };
  } catch {
    return null;
  }
}
