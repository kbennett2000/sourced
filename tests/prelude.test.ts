import { describe, expect, it } from "vitest";
import { buildPrelude } from "@/lib/prelude";
import type { RetrievalResult } from "@/lib/types";

const result: RetrievalResult = {
  retrievalMs: 123,
  sources: [
    { index: 1, title: "First", url: "https://a.com", snippet: "Alpha" },
    { index: 2, title: "Second", url: "https://b.com", snippet: "Beta" },
  ],
};

describe("buildPrelude", () => {
  it("maps a retrieval result onto the snake_case wire shape", () => {
    expect(buildPrelude("web", result)).toEqual({
      endpoint: "web",
      retrieval_ms: 123,
      source_count: 2,
      sources: result.sources,
    });
  });

  it("sets source_count to the number of sources", () => {
    expect(buildPrelude("context", { retrievalMs: 0, sources: [] })).toEqual({
      endpoint: "context",
      retrieval_ms: 0,
      source_count: 0,
      sources: [],
    });
  });
});
