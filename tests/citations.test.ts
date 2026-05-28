import { describe, expect, it } from "vitest";
import { parseCitations } from "@/lib/citations";

describe("parseCitations", () => {
  it("splits text around single citation markers", () => {
    expect(parseCitations("a [1] b [2]")).toEqual([
      { type: "text", value: "a " },
      { type: "cite", n: 1 },
      { type: "text", value: " b " },
      { type: "cite", n: 2 },
    ]);
  });

  it("emits adjacent markers without an empty text node between them", () => {
    expect(parseCitations("x [1][2] y")).toEqual([
      { type: "text", value: "x " },
      { type: "cite", n: 1 },
      { type: "cite", n: 2 },
      { type: "text", value: " y" },
    ]);
  });

  it("preserves trailing text after the last marker", () => {
    expect(parseCitations("see [3] now")).toEqual([
      { type: "text", value: "see " },
      { type: "cite", n: 3 },
      { type: "text", value: " now" },
    ]);
  });

  it("returns a single text segment when there are no markers", () => {
    expect(parseCitations("plain answer")).toEqual([
      { type: "text", value: "plain answer" },
    ]);
  });

  it("parses multi-digit indices", () => {
    expect(parseCitations("[12]")).toEqual([{ type: "cite", n: 12 }]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCitations("")).toEqual([]);
  });
});
