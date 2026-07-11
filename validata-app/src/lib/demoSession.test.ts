import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signDemoSession, verifyDemoSession } from './demoSession';

describe('signDemoSession / verifyDemoSession', () => {
  const originalSecret = process.env.DEMO_SESSION_SECRET;

  beforeEach(() => {
    process.env.DEMO_SESSION_SECRET = 'test-secret';
  });
  afterEach(() => {
    process.env.DEMO_SESSION_SECRET = originalSecret;
  });

  it('round-trips a signed payload', async () => {
    const token = await signDemoSession({ email: 'mentor@demo.com', role: 'mentor', status: 'active' });
    expect(token).toBeTruthy();
    const payload = await verifyDemoSession(token!);
    expect(payload).toEqual({ email: 'mentor@demo.com', role: 'mentor', status: 'active' });
  });

  it('fails closed (returns null) when the secret is missing, for both signing and verifying', async () => {
    delete process.env.DEMO_SESSION_SECRET;
    expect(await signDemoSession({ email: 'x@x.com', role: 'mentor', status: 'active' })).toBeNull();
    expect(await verifyDemoSession('anything.here')).toBeNull();
  });

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const token = await signDemoSession({ email: 'mentor@demo.com', role: 'mentor', status: 'active' });
    const [payload, signature] = token!.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ email: 'admin@demo.com', role: 'admin', status: 'active' })).toString('base64url');
    expect(await verifyDemoSession(`${tamperedPayload}.${signature}`)).toBeNull();
    void payload;
  });

  it('rejects malformed cookie values', async () => {
    expect(await verifyDemoSession('not-a-valid-token')).toBeNull();
    expect(await verifyDemoSession('a.b.c')).toBeNull();
  });
});
