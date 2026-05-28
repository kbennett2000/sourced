import { describe, expect, it } from "vitest";
import { classifySnippet } from "@/lib/snippet";

describe("classifySnippet", () => {
  it("treats ordinary prose as prose", () => {
    expect(
      classifySnippet(
        "The Brave Search API is an interface that lets developers integrate search.",
      ),
    ).toBe("prose");
  });

  it("does not misclassify prose containing a single pipe or braces", () => {
    expect(classifySnippet("Use the A | B syntax for either option.")).toBe(
      "prose",
    );
    expect(classifySnippet("Set the {config} value before running.")).toBe(
      "prose",
    );
  });

  it("classifies a valid JSON object or array as structured", () => {
    expect(classifySnippet('{"a":1,"b":2}')).toBe("structured");
    expect(classifySnippet('[{"x":1},{"x":2}]')).toBe("structured");
  });

  it("classifies a truncated JSON fragment as structured", () => {
    expect(
      classifySnippet('{"title":"Brave Search API","table":[{"Data Type":"Web'),
    ).toBe("structured");
  });

  it("classifies fenced code as structured", () => {
    expect(classifySnippet("```js\nconst x = 1;\n```")).toBe("structured");
  });

  it("classifies a markdown-style table as structured", () => {
    expect(classifySnippet("| name | type |\n| ---- | ---- |\n| q | str |")).toBe(
      "structured",
    );
  });

  it("treats empty/whitespace as prose", () => {
    expect(classifySnippet("   ")).toBe("prose");
  });
});
