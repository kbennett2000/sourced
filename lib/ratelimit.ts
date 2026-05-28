/**
 * Simple in-memory, per-IP fixed-window rate limiter. Sufficient for a
 * single-instance demo. Upgrade path: Upstash Ratelimit for durable,
 * cross-instance limits (state here is lost on cold start / not shared between
 * serverless instances).
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + WINDOW_MS;
    buckets.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - bucket.count,
    resetAt: bucket.resetAt,
  };
}
