import { describe, expect, it } from "vitest";
import { buildContext, buildSystemPrompt } from "@/lib/prompt";
import type { Source } from "@/lib/types";

const sources: Source[] = [
  { index: 1, title: "First", url: "https://a.com", snippet: "Alpha snippet" },
  { index: 2, title: "Second", url: "https://b.com", snippet: "Beta snippet" },
];

describe("buildContext", () => {
  it("numbers each source and includes title, url, and snippet", () => {
    const ctx = buildContext(sources);
    expect(ctx).toContain("[1] First");
    expect(ctx).toContain("https://a.com");
    expect(ctx).toContain("Alpha snippet");
    expect(ctx).toContain("[2] Second");
    expect(ctx).toContain("Beta snippet");
  });

  it("returns a non-empty placeholder for empty sources, without a [1] marker", () => {
    const ctx = buildContext([]);
    expect(ctx.length).toBeGreaterThan(0);
    expect(ctx).not.toContain("[1]");
  });
});

describe("buildSystemPrompt", () => {
  it("instructs the model to use only the sources and cite with [n] markers", () => {
    const p = buildSystemPrompt();
    expect(p).toMatch(/only/i);
    expect(p).toMatch(/cite/i);
    expect(p).toContain("[1]");
  });
});
