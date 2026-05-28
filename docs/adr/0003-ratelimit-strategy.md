# ADR 0003 — Rate-limit strategy

- Status: Accepted
- Date: 2026-05-28

## Context

`/api/answer` spends money on every call (Brave query + Anthropic tokens). The
public demo runs on the owner's keys (SPEC §7), so the route needs a cheap abuse
guard. It does not need precise, distributed, or durable limiting — it needs
"stop a single client from hammering the endpoint" with near-zero operational
cost and no new infrastructure.

## Decision

Keep an **in-memory, per-IP fixed-window** limiter (`lib/ratelimit.ts`): a
`Map<ip, { count, resetAt }>` checked once per request. Cap and window are
configurable via env — `RATE_LIMIT_MAX` (default 30) and `RATE_LIMIT_WINDOW_MS`
(default 3_600_000 = 1 hour). The route surfaces standard headers on **every**
answer response:

- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch seconds).

A throttled request returns **429** with a structured JSON body
`{ error, retryAfterSeconds }` and a `Retry-After` header.

## Consequences

- Positive: zero dependencies, zero infra, trivially testable, good-enough abuse
  protection for a demo. Clients get conventional, machine-readable limit signals.
- **Tradeoff (deliberate):** state is per-instance and in-memory. On Vercel it
  resets on cold start and is **not shared across concurrent instances**, so the
  effective global limit can exceed `RATE_LIMIT_MAX` under fan-out. Acceptable
  for a demo; not suitable for real multi-tenant production.

## Upgrade path — Upstash Ratelimit (durable, cross-instance)

Swap the body of `checkRateLimit` for a Redis-backed limiter; the route contract
(returning `{ allowed, limit, remaining, resetAt }`) stays the same:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(30, "1 h"),
  prefix: "sourced",
});

export async function checkRateLimit(ip: string) {
  const { success, limit, remaining, reset } = await limiter.limit(ip);
  return { allowed: success, limit, remaining, resetAt: reset };
}
```

This makes the limit global and durable across instances/restarts at the cost of
a network round trip per request and two new env vars
(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Out of scope for this
cycle.
