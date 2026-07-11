// Minimal in-memory rate limiter, used to throttle credential probes on
// /api/auth/verify-credentials. This is process-local - on Vercel's
// serverless platform each instance has its own counters, so it is
// best-effort defense-in-depth, not a hard guarantee. A shared store (e.g.
// Redis/Upstash) would be needed for a real guarantee across instances.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > maxAttempts;
}
