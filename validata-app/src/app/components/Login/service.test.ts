import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { performDemoLogin } from './service';
import { getCookie } from '../../../lib/cookies';

// performDemoLogin does not write the demo-session cookie itself (it's
// HMAC-signed and HttpOnly, set by the server in POST /api/auth/demo-login)
// - it just calls that endpoint and caches the UI-only user-role/user-status
// hints.
describe('performDemoLogin (demo login golden path)', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the demo-login endpoint and caches the returned role', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, role: 'mentor', email: 'mentor@demo.com' }),
    }));

    const result = await performDemoLogin('mentor@demo.com', 'demo123');
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/auth/demo-login', expect.objectContaining({ method: 'POST' }));

    expect(getCookie('user-role')).toBe('mentor');
    expect(getCookie('user-status')).toBe('active');
  });

  it('supports the team_member demo role too', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, role: 'team_member', email: 'team@demo.com' }),
    }));

    await performDemoLogin('team@demo.com', 'demo123');
    expect(getCookie('user-role')).toBe('team_member');
  });

  it('throws when the server rejects the credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid demo credentials.' }),
    }));

    await expect(performDemoLogin('wrong@demo.com', 'nope')).rejects.toThrow('Invalid demo credentials.');
  });
});
