"use client";

import { useState } from "react";
import { classifySnippet } from "@/lib/snippet";
import type { Source } from "@/lib/types";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function SourceCard({
  source,
  highlighted,
}: {
  source: Source;
  highlighted: boolean;
}) {
  const host = hostOf(source.url);
  const kind = classifySnippet(source.snippet);
  const [expanded, setExpanded] = useState(false);

  return (
    <li
      id={`source-${source.index}`}
      className={[
        "scroll-mt-4 rounded-lg border p-3 transition",
        highlighted
          ? "border-orange-500 ring-2 ring-orange-400/60"
          : "border-gray-200 dark:border-neutral-800",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-xs text-gray-400">
          [{source.index}]
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 rounded"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
            <span className="truncate">{source.title}</span>
          </a>
          <div className="truncate text-xs text-gray-400">{host}</div>

          {source.snippet &&
            (kind === "prose" ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                {source.snippet}
              </p>
            ) : (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-gray-500 underline dark:text-neutral-400"
                >
                  {expanded ? "Hide" : "Show"} structured content
                </button>
                {expanded && (
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-neutral-900">
                    {source.snippet}
                  </pre>
                )}
              </div>
            ))}
        </div>
      </div>
    </li>
  );
}
