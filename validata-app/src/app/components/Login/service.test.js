import { describe, it, expect, beforeEach } from 'vitest';
import { performDemoLogin } from './service';
import { getCookie } from '../../../lib/cookies';

describe('performDemoLogin (demo login golden path)', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    });
  });

  it('marks the session as demo, active, with the requested role, as JSON page.js can parse', () => {
    const result = performDemoLogin('mentor', 'mentor@demo.com');
    expect(result.success).toBe(true);

    // page.js's init effect does JSON.parse(getCookie('demo-session')) and reads
    // .email/.role/.status off the result - this must stay valid JSON with those keys.
    const session = JSON.parse(getCookie('demo-session'));
    expect(session).toEqual({ email: 'mentor@demo.com', role: 'mentor', status: 'active' });

    expect(getCookie('user-role')).toBe('mentor');
    expect(getCookie('user-status')).toBe('active');
  });

  it('supports the team_member demo role too', () => {
    performDemoLogin('team_member', 'team@demo.com');
    expect(getCookie('user-role')).toBe('team_member');
    expect(JSON.parse(getCookie('demo-session')).email).toBe('team@demo.com');
  });
});
