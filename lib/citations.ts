export type CitationSegment =
  | { type: "text"; value: string }
  | { type: "cite"; n: number };

const CITATION_RE = /\[(\d{1,3})\]/g;

/**
 * Splits answer text into plain-text and citation segments. Inline markers like
 * `[1]` or `[12]` become `cite` segments; everything else is `text`. Adjacent
 * markers (`[1][2]`) produce consecutive `cite` segments with no empty text
 * node between them, and any trailing text after the last marker is preserved.
 * Whether a cited index actually exists is decided at render time.
 */
export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITATION_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    segments.push({ type: "cite", n: Number(match[1]) });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}
