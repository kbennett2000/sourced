"use client";

import { useState } from "react";
import type { AnswerPrelude, Source } from "@/lib/types";

type StreamState = {
  loading: boolean;
  answer: string;
  sources: Source[];
  error: string | null;
};

const INITIAL: StreamState = {
  loading: false,
  answer: "",
  sources: [],
  error: null,
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<StreamState>(INITIAL);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || state.loading) return;

    setState({ loading: true, answer: "", sources: [], error: null });

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // endpoint is fixed to "web" for Cycle 1; the toggle arrives in Cycle 2.
        body: JSON.stringify({ question: q, endpoint: "web" }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        setState((s) => ({
          ...s,
          loading: false,
          error: text || `Request failed (${res.status})`,
        }));
        return;
      }

      // Read the NDJSON prelude (first line = { sources }), then stream text.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawPrelude = false;
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (!sawPrelude) {
          const nl = buffer.indexOf("\n");
          if (nl === -1) continue;
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          sawPrelude = true;
          try {
            const prelude = JSON.parse(line) as AnswerPrelude;
            setState((s) => ({ ...s, sources: prelude.sources }));
          } catch {
            // Ignore a malformed prelude; keep streaming the answer text.
          }
        }

        if (sawPrelude && buffer) {
          answer += buffer;
          buffer = "";
          setState((s) => ({ ...s, answer }));
        }
      }

      setState((s) => ({ ...s, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Sourced</h1>
      <p className="mt-1 text-sm text-gray-600">
        Ask a question. Get a grounded, cited answer from the live web.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything..."
          disabled={state.loading}
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={state.loading || !question.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {state.loading ? "..." : "Ask"}
        </button>
      </form>

      {state.error && <p className="mt-4 text-sm text-red-600">{state.error}</p>}

      {state.answer && (
        <section className="mt-6 whitespace-pre-wrap leading-relaxed">
          {state.answer}
        </section>
      )}

      {state.sources.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sources
          </h2>
          <ol className="mt-2 space-y-3">
            {state.sources.map((s) => (
              <li key={s.index} className="text-sm">
                <span className="font-mono text-gray-400">[{s.index}]</span>{" "}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  {s.title}
                </a>
                <p className="text-gray-600">{s.snippet}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
