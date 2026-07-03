import { describe, it, expect, beforeEach } from 'vitest';
import { setCookie, getCookie, deleteCookie } from './cookies';

describe('cookies', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    });
  });

  it('round-trips a value through set/get', () => {
    setCookie('user-role', 'mentor', 7);
    expect(getCookie('user-role')).toBe('mentor');
  });

  it('returns null for a cookie that was never set', () => {
    expect(getCookie('does-not-exist')).toBeNull();
  });

  it('removes a cookie so it can no longer be read', () => {
    setCookie('demo-session', 'true', 7);
    expect(getCookie('demo-session')).toBe('true');
    deleteCookie('demo-session');
    expect(getCookie('demo-session')).toBeNull();
  });
});
