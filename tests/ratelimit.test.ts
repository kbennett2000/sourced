import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { __resetRateLimit, checkRateLimit } from "@/lib/ratelimit";

beforeAll(() => {
  // Set a small cap before the first getEnv() (lazy + memoized) call.
  process.env.RATE_LIMIT_MAX = "3";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
});

afterEach(() => __resetRateLimit());

describe("checkRateLimit", () => {
  it("allows requests up to the cap, then denies", () => {
    const ip = "1.2.3.4";
    expect(checkRateLimit(ip)).toMatchObject({ allowed: true, limit: 3, remaining: 2 });
    expect(checkRateLimit(ip)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit(ip)).toMatchObject({ allowed: true, remaining: 0 });

    const denied = checkRateLimit(ip);
    expect(denied).toMatchObject({ allowed: false, remaining: 0, limit: 3 });
    expect(denied.resetAt).toBeGreaterThan(Date.now());
  });

  it("tracks IPs independently", () => {
    expect(checkRateLimit("a").allowed).toBe(true);
    expect(checkRateLimit("b").remaining).toBe(2);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    try {
      const ip = "9.9.9.9";
      for (let i = 0; i < 3; i++) checkRateLimit(ip);
      expect(checkRateLimit(ip).allowed).toBe(false);
      vi.advanceTimersByTime(60_001);
      expect(checkRateLimit(ip).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
