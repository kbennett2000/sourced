"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerPrelude, Endpoint } from "@/lib/types";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export type AnswerState = {
  status: StreamStatus;
  answer: string;
  prelude: AnswerPrelude | null;
  error: string | null;
};

const INITIAL: AnswerState = {
  status: "idle",
  answer: "",
  prelude: null,
  error: null,
};

/**
 * Drives a single answer request: POSTs { question, endpoint }, reads the NDJSON
 * prelude, then streams answer text. An in-flight request is aborted when a new
 * one starts (or on unmount) so streams never interleave.
 */
export function useAnswerStream() {
  const [state, setState] = useState<AnswerState>(INITIAL);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (question: string, endpoint: Endpoint) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: "streaming", answer: "", prelude: null, error: null });

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, endpoint }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = `Request failed (${res.status})`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // non-JSON error body; keep the default message
        }
        setState((s) => ({ ...s, status: "error", error: message }));
        return;
      }

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
            setState((s) => ({ ...s, prelude }));
          } catch {
            // ignore a malformed prelude; keep streaming answer text
          }
        }

        if (sawPrelude && buffer) {
          answer += buffer;
          buffer = "";
          setState((s) => ({ ...s, answer }));
        }
      }

      setState((s) => ({ ...s, status: "done" }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }, []);

  return { state, run };
}
