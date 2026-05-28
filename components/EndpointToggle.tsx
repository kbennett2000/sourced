"use client";

import type { Endpoint } from "@/lib/types";

const OPTIONS: { value: Endpoint; label: string; description: string }[] = [
  {
    value: "web",
    label: "Web Search",
    description: "Ranked links + snippets you format yourself.",
  },
  {
    value: "context",
    label: "LLM Context",
    description: "Model-ready grounding in a single call.",
  },
];

export function EndpointToggle({
  value,
  onChange,
  disabled,
}: {
  value: Endpoint;
  onChange: (endpoint: Endpoint) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Retrieval endpoint"
      className="grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-lg border px-3 py-2 text-left transition disabled:opacity-50",
              active
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40"
                : "border-gray-200 hover:border-gray-300 dark:border-neutral-800 dark:hover:border-neutral-700",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{opt.label}</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
              {opt.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
