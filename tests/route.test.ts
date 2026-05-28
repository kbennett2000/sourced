import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// route.ts statically imports the AI SDK + Brave client; mock them so the route
// can be exercised without network/keys. BraveError must be exported (the route
// does `instanceof BraveError`).
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => ({}) }));
vi.mock("ai", () => ({
  streamText: () => ({
    textStream: (async function* () {
      yield "answer text";
    })(),
  }),
}));
vi.mock("@/lib/brave", () => ({
  BraveError: class BraveError extends Error {
    constructor(
      public status: number,
      public body: string,
    ) {
      super("brave");
    }
  },
  webSearch: async () => ({
    sources: [{ index: 1, title: "T", url: "https://x.com", snippet: "s" }],
    retrievalMs: 5,
  }),
  llmContext: async () => ({ sources: [], retrievalMs: 5 }),
}));

import { POST } from "@/app/api/answer/route";
import { __resetRateLimit } from "@/lib/ratelimit";

function post(ip: string) {
  return POST(
    new Request("http://localhost/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ question: "hello world", endpoint: "web" }),
    }),
  );
}

beforeAll(() => {
  process.env.RATE_LIMIT_MAX = "2";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
});

afterEach(() => __resetRateLimit());

describe("POST /api/answer rate limiting", () => {
  it("returns 200 with X-RateLimit-* headers on an allowed request", async () => {
    const res = await post("10.0.0.1");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("1");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("returns 429 with Retry-After and a JSON body once the cap is exceeded", async () => {
    await post("10.0.0.2");
    await post("10.0.0.2");
    const res = await post("10.0.0.2");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body = await res.json();
    expect(body).toMatchObject({
      error: expect.any(String),
      retryAfterSeconds: expect.any(Number),
    });
  });
});
