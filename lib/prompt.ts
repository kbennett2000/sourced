import type { Source } from "@/lib/types";

/** Renders sources as a numbered grounding block the model can cite by index. */
export function buildContext(sources: Source[]): string {
  if (sources.length === 0) {
    return "No sources were found for this question.";
  }
  return sources
    .map((s) => `[${s.index}] ${s.title}\n${s.url}\n${s.snippet}`)
    .join("\n\n");
}

/** System prompt: answer only from the provided sources, cite with [n] markers. */
export function buildSystemPrompt(): string {
  return [
    "You are Sourced, a grounded answer engine.",
    "Answer the question using ONLY the numbered sources provided in the context.",
    "Cite every claim with inline markers like [1] or [2] that refer to those source numbers; you may cite several at once, e.g. [1][3].",
    "If the sources do not contain enough information to answer, say so plainly instead of guessing.",
    "Never invent facts, URLs, or sources beyond those provided.",
    "Keep the answer concise and directly responsive to the question.",
    "Write in plain prose; do not use markdown headings, bold, bullet lists, or code fences.",
  ].join(" ");
}
