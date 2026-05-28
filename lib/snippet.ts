export type SnippetKind = "prose" | "structured";

/**
 * Classifies a source snippet so the UI can render non-prose content (raw JSON,
 * tables, fenced code) in a collapsed monospace block instead of inline. Brave's
 * LLM Context endpoint sometimes returns such structured chunks mixed with prose.
 *
 * Deliberately conservative — returns "structured" only on a confident signal so
 * ordinary prose (which may mention braces or a single pipe) is never misflagged.
 */
export function classifySnippet(snippet: string): SnippetKind {
  const s = snippet.trim();
  if (!s) return "prose";

  // Fenced code block.
  if (s.includes("```")) return "structured";

  // JSON object/array: parses cleanly, or is an unmistakable (possibly
  // truncated) JSON fragment like {"key":... or [{"key":...
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      JSON.parse(s);
      return "structured";
    } catch {
      // not complete JSON; check for an unmistakable structural opener
    }
    if (/^[[{]\s*["{[]/.test(s) || s.includes('":')) return "structured";
  }

  // Table-like: 2+ consecutive lines each with 2+ pipe characters.
  let pipeRun = 0;
  for (const line of s.split("\n")) {
    const pipes = (line.match(/\|/g) ?? []).length;
    if (pipes >= 2) {
      pipeRun += 1;
      if (pipeRun >= 2) return "structured";
    } else {
      pipeRun = 0;
    }
  }

  return "prose";
}
