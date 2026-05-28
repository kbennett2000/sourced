import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BraveError, llmContext, webSearch } from "@/lib/brave";

function mockResponse(opts: {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
  headers?: Record<string, string>;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status,
    headers: new Headers(opts.headers ?? {}),
    json: async () => opts.json,
    text: async () => opts.text ?? "",
  } as unknown as Response;
}

describe("webSearch", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes web results into a 1-based Source[]", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "42" },
        json: {
          web: {
            results: [
              { title: "T1", url: "https://1.com", description: "D1" },
              { title: "T2", url: "https://2.com", description: "D2" },
            ],
          },
        },
      }),
    );

    const result = await webSearch("hello");
    expect(result.sources).toEqual([
      { index: 1, title: "T1", url: "https://1.com", snippet: "D1" },
      { index: 2, title: "T2", url: "https://2.com", snippet: "D2" },
    ]);
    expect(typeof result.retrievalMs).toBe("number");
    expect(result.retrievalMs).toBeGreaterThanOrEqual(0);
  });

  it("sends the X-Subscription-Token header", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ ok: true, status: 200, json: { web: { results: [] } } }),
    );

    await webSearch("hello");

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Subscription-Token"]).toBe("test-brave-key");
  });

  it("throws BraveError with status and body on a non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ ok: false, status: 401, text: "unauthorized" }),
    );

    await expect(webSearch("x")).rejects.toMatchObject({
      name: "BraveError",
      status: 401,
      body: "unauthorized",
    });
  });
});

describe("llmContext", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("joins snippets per grounding item into a Source[]", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({
        ok: true,
        status: 200,
        json: {
          grounding: {
            generic: [
              { url: "https://x.com", title: "X", snippets: ["a", "b"] },
            ],
          },
        },
      }),
    );

    const result = await llmContext("q");
    expect(result.sources).toEqual([
      { index: 1, title: "X", url: "https://x.com", snippet: "a b" },
    ]);
    expect(typeof result.retrievalMs).toBe("number");
    expect(result.retrievalMs).toBeGreaterThanOrEqual(0);
  });

  it("returns no sources when grounding is missing (tolerant to shape drift)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ ok: true, status: 200, json: {} }),
    );

    const result = await llmContext("q");
    expect(result.sources).toEqual([]);
  });

  it("throws BraveError on a non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockResponse({ ok: false, status: 429, text: "rate limited" }),
    );

    await expect(llmContext("q")).rejects.toBeInstanceOf(BraveError);
  });
});
