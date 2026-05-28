# ADR 0002 — Cycle 1 stream transport (NDJSON prelude)

- Status: Accepted
- Date: 2026-05-28

## Context

`app/api/answer/route.ts` must stream the model's answer token-by-token while
also handing the client the `Source[]` metadata it needs to render source cards
and resolve inline `[n]` citation markers. `docs/architecture.md` sketches this
as sending source metadata "as data parts / response headers."

Two constraints shaped the decision:

1. **The request contract is fixed** to `{ question, endpoint }` (not the AI SDK
   `useChat` `{ messages }` shape), so the client uses a manual `fetch` rather
   than `useChat`.
2. **Sources are fully known before streaming begins** — retrieval (Brave)
   completes before the LLM call starts.

The idiomatic AI SDK v6 "data parts" path (`createUIMessageStream` +
`writer.write({ type: 'data-sources' })` + `writer.merge(...)`, consumed with
`useChat`) is clean on the server, but with a manual `fetch` the client must
hand-parse the SSE UI-message stream via `parseJsonEventStream` — a semi-internal,
thinly-documented helper. A response header for sources is also unworkable: ~20
sources with snippets routinely exceed the ~8KB header budget.

## Decision

For Cycle 1, send sources as an **NDJSON prelude**: the route emits
`JSON.stringify({ sources }) + "\n"` as the first line of a plain
`text/plain` response, then streams answer text from `result.textStream`. The
client reads the first line as JSON (the sources), then treats everything after
the newline as streamed answer text.

This depends only on stable AI SDK core (`streamText().textStream`) and the Web
Streams API — no reliance on the evolving UI-message-stream protocol or
semi-internal parsing helpers.

## Options considered

- **NDJSON prelude (chosen).** Simple, robust, trivially testable, no fragile
  deps. Custom (non-standard) wire format that both ends must agree on.
- **Idiomatic AI SDK v6 data parts.** Matches `architecture.md` wording and is
  the natural fit *with* `useChat`, but the manual-fetch client must use
  `parseJsonEventStream` (semi-internal) — more code and more risk for a Cycle-1
  plain UI.
- **Sources in a response header.** Rejected: header-size limits make it
  unreliable once snippets are included.

## Consequences

- Positive: minimal, dependency-light, fast to ship and test; satisfies the
  "stream answer + resolve `[n]` + render source cards" goal.
- Tradeoff: a bespoke wire format rather than the AI SDK's. Confined to
  `route.ts` and the client read loop in `app/page.tsx`, so it is a clean swap.
- **Cycle-2 upgrade path:** migrate to the idiomatic data-parts approach
  (`createUIMessageStream` + `useChat`) when the UI gains polish; only those two
  files change. This is a refinement of `docs/architecture.md`, not a change to
  ADR 0001 (which is silent on wire format).

## Cycle 2 update — extended prelude shape

The prelude grew from `{ sources }` to carry endpoint telemetry so the UI can
show the Web-Search-vs-LLM-Context tradeoff (source count + retrieval latency):

```jsonc
// first NDJSON line of the answer stream
{
  "endpoint": "web" | "context",
  "retrieval_ms": 878,        // full Brave round trip incl. JSON parse
  "source_count": 10,
  "sources": [ { "index": 1, "title": "...", "url": "...", "snippet": "..." }, ... ]
}
```

- Wire keys are snake_case by contract (`retrieval_ms`, `source_count`); the
  shape is the `AnswerPrelude` type in `lib/types.ts`, built by the pure
  `buildPrelude()` in `lib/prelude.ts` (kept out of the route so it's testable
  without importing the AI SDK).
- `retrieval_ms` measures the **full** Brave round trip, including `res.json()`
  parsing — the honest number to surface to a user, and cheap for ~10 results.
- Backward compatible: `sources` remains present, so the change is additive.
