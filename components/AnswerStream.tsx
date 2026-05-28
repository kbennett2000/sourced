"use client";

import { parseCitations } from "@/lib/citations";

export function AnswerStream({
  text,
  sourceCount,
  onCite,
}: {
  text: string;
  sourceCount: number;
  onCite: (n: number) => void;
}) {
  const segments = parseCitations(text);

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-7">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        // A hallucinated marker (no matching source) renders as inert text.
        if (seg.n < 1 || seg.n > sourceCount) {
          return <span key={i}>[{seg.n}]</span>;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite(seg.n)}
            aria-label={`Jump to source ${seg.n}`}
            className="mx-0.5 inline-flex items-center rounded bg-orange-100 px-1 align-baseline text-xs font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-950/50 dark:text-orange-300"
          >
            {seg.n}
          </button>
        );
      })}
    </div>
  );
}
