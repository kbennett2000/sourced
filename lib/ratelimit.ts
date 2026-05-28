import { getEnv } from "@/lib/env";

/**
 * In-memory, per-IP fixed-window rate limiter. Cap + window come from env
 * (RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS; defaults 30 / 1h).
 *
 * Deliberately simple for a demo: state lives in this module's Map, so it is
 * per-instance and resets on cold start — NOT shared across serverless
 * instances. See docs/adr/0003-ratelimit-strategy.md for the rationale and the
 * Upstash Ratelimit upgrade path for durable, cross-instance limits.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Window reset time, epoch milliseconds. */
  resetAt: number;
};

export function checkRateLimit(ip: string): RateLimitResult {
  const { RATE_LIMIT_MAX: limit, RATE_LIMIT_WINDOW_MS: windowMs } = getEnv();
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(ip, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, limit, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Test-only: clears all rate-limit state. */
export function __resetRateLimit(): void {
  buckets.clear();
}
