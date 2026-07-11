import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRateLimited } from './rate-limit';

describe('isRateLimited', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not rate-limit the first attempt for a fresh key', () => {
    expect(isRateLimited(`key-${Math.random()}`, 3, 60_000)).toBe(false);
  });

  it('rate-limits once maxAttempts is exceeded within the window', () => {
    const key = `key-${Math.random()}`;
    expect(isRateLimited(key, 2, 60_000)).toBe(false); // 1st
    expect(isRateLimited(key, 2, 60_000)).toBe(false); // 2nd (count=2, not > max)
    expect(isRateLimited(key, 2, 60_000)).toBe(true);  // 3rd (count=3 > 2)
  });

  it('resets the counter once the window has elapsed', () => {
    vi.useFakeTimers();
    const key = `key-${Math.random()}`;
    expect(isRateLimited(key, 1, 1000)).toBe(false); // 1st, resets at now+1000
    expect(isRateLimited(key, 1, 1000)).toBe(true);   // 2nd, still within window

    vi.advanceTimersByTime(1001);
    expect(isRateLimited(key, 1, 1000)).toBe(false); // window elapsed - fresh count
  });

  it('tracks separate keys independently', () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    expect(isRateLimited(keyA, 1, 60_000)).toBe(false);
    expect(isRateLimited(keyA, 1, 60_000)).toBe(true);
    expect(isRateLimited(keyB, 1, 60_000)).toBe(false);
  });
});
