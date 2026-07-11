import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/demoSession', () => ({ signDemoSession: vi.fn() }));

describe('POST /api/auth/demo-login', () => {
  const originalDemoEnabled = process.env.NEXT_PUBLIC_DEMO_ENABLED;
  const originalSecret = process.env.DEMO_SESSION_SECRET;

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_ENABLED = originalDemoEnabled;
    process.env.DEMO_SESSION_SECRET = originalSecret;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fails closed with 403 when demo mode is disabled', async () => {
    delete process.env.NEXT_PUBLIC_DEMO_ENABLED;
    vi.resetModules();
    const { POST } = await import('./route');

    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'mentor@demo.com', password: 'demo123' }) }));
    expect(res.status).toBe(403);
  });

  describe('when demo mode is enabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_ENABLED = 'true';
      vi.resetModules();
    });

    it('rejects an unknown email', async () => {
      const { POST } = await import('./route');
      const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'nobody@demo.com', password: 'demo123' }) }));
      expect(res.status).toBe(401);
    });

    it('rejects a wrong password for a known account', async () => {
      const { POST } = await import('./route');
      const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'mentor@demo.com', password: 'wrong' }) }));
      expect(res.status).toBe(401);
    });

    it('fails closed with 500 when DEMO_SESSION_SECRET is missing (signDemoSession returns null)', async () => {
      const { signDemoSession } = await import('@/lib/demoSession');
      vi.mocked(signDemoSession).mockResolvedValue(null);
      const { POST } = await import('./route');

      const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'mentor@demo.com', password: 'demo123' }) }));
      expect(res.status).toBe(500);
    });

    it('succeeds for a valid demo account and sets a Set-Cookie header with HttpOnly + SameSite=Strict', async () => {
      const { signDemoSession } = await import('@/lib/demoSession');
      vi.mocked(signDemoSession).mockResolvedValue('signed-value');
      const { POST } = await import('./route');

      const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'mentor@demo.com', password: 'demo123' }) }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true, role: 'mentor', email: 'mentor@demo.com' });

      const setCookie = res.headers.get('Set-Cookie') ?? '';
      expect(setCookie).toContain('demo-session=signed-value');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
    });
  });
});
