import type { AnswerPrelude, Endpoint, RetrievalResult } from "@/lib/types";

/**
 * Builds the answer-stream prelude (the first NDJSON line) from a retrieval
 * result. Pure + free of AI SDK imports so it stays cheap to unit-test.
 */
export function buildPrelude(
  endpoint: Endpoint,
  result: RetrievalResult,
): AnswerPrelude {
  return {
    endpoint,
    retrieval_ms: result.retrievalMs,
    source_count: result.sources.length,
    sources: result.sources,
  };
}
