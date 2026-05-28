"use client";

import { useRef, useState } from "react";
import { AnswerStream } from "@/components/AnswerStream";
import { EndpointToggle } from "@/components/EndpointToggle";
import { SourceCard } from "@/components/SourceCard";
import { StatsBar } from "@/components/StatsBar";
import { useAnswerStream } from "@/components/useAnswerStream";
import type { Endpoint } from "@/lib/types";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [endpoint, setEndpoint] = useState<Endpoint>("web");
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { state, run } = useAnswerStream();

  const busy = state.status === "streaming";
  const { prelude, answer, error, status } = state;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    run(q, endpoint);
  }

  function handleCite(n: number) {
    const el = document.getElementById(`source-${n}`);
    if (el) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    }
    setHighlighted(n);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlighted(null), 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Sourced</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          A grounded answer engine. Ask a question — get a streamed, cited answer
          from Brave&apos;s independent web index.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <EndpointToggle value={endpoint} onChange={setEndpoint} disabled={busy} />
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything..."
            maxLength={400}
            disabled={busy}
            className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-neutral-700"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {busy ? "Asking..." : "Ask"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {prelude && <StatsBar prelude={prelude} />}

      {busy && !answer && (
        <div className="space-y-2" aria-hidden>
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
        </div>
      )}

      {answer && (
        <section aria-label="Answer">
          <AnswerStream
            text={answer}
            sourceCount={prelude?.source_count ?? 0}
            onCite={handleCite}
          />
        </section>
      )}

      {prelude && prelude.sources.length > 0 && (
        <section aria-label="Sources">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400">
            Sources
          </h2>
          <ol className="space-y-2">
            {prelude.sources.map((s) => (
              <SourceCard
                key={s.index}
                source={s}
                highlighted={highlighted === s.index}
              />
            ))}
          </ol>
        </section>
      )}

      {status === "done" && prelude?.sources.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          No sources found for that question. Try rephrasing.
        </p>
      )}
    </main>
  );
}
