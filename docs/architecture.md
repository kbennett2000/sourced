# Architecture — Sourced

Single Next.js (App Router) application deployed to Vercel. One page, one API
route, a thin Brave client, and an LLM streaming layer via the Vercel AI SDK.

## Request flow

```
Browser (page.tsx)
   │  POST /api/answer  { question, endpoint: "web" | "context" }
   ▼
app/api/answer/route.ts   (server, Node runtime)
   │  1. validate body (Zod)
   │  2. rate-limit by IP (emits X-RateLimit-* headers; 429 + Retry-After if over)
   │  3. retrieve via lib/brave.ts  ──►  Brave Search API
   │        - webSearch()    → /res/v1/web/search   ┐ both return
   │        - llmContext()   → /res/v1/llm/context  ┘ RetrievalResult { sources, retrievalMs }
   │  4. build grounding context + system prompt (lib/prompt.ts)
   │  5. streamText({ model: anthropic("claude-sonnet-4-6"), ... })
   ▼
Response (text/plain):
   line 1  NDJSON prelude  { endpoint, retrieval_ms, source_count, sources }
   rest    streamed answer text (plain prose with inline [n] markers)
   ▼
Browser reads the prelude (stats + source cards), then renders the streaming
answer, turning [n] markers into pills that scroll to the matching SourceCard
```

## Directory shape

```
app/
  layout.tsx              # root layout (system light/dark base colors)
  page.tsx                # single-page UI (client): owns question/endpoint state
  api/
    answer/route.ts       # POST handler: retrieve → ground → stream
components/
  EndpointToggle.tsx      # Web Search vs LLM Context switch
  StatsBar.tsx            # endpoint + source count + retrieval_ms (the "diff")
  AnswerStream.tsx        # renders streamed answer, [n] markers → clickable pills
  SourceCard.tsx          # one source: favicon, host, snippet (collapses non-prose)
  useAnswerStream.ts      # client hook: POST + read prelude + stream (AbortController)
lib/
  brave.ts                # Brave client: webSearch(), llmContext() → RetrievalResult
  prelude.ts              # pure buildPrelude(): RetrievalResult → AnswerPrelude
  prompt.ts               # system prompt + context builder + citation rules
  citations.ts            # pure parseCitations(): text → text/cite segments
  snippet.ts              # pure classifySnippet(): prose | structured
  ratelimit.ts            # per-IP fixed-window limiter (env-configurable)
  logger.ts               # structured logging wrapper
  env.ts                  # Zod-validated env (keys + rate-limit config)
  types.ts                # shared types + Zod (Source, AnswerRequest, AnswerPrelude)
tests/
  brave.test.ts  prelude.test.ts  prompt.test.ts
  citations.test.ts  snippet.test.ts  ratelimit.test.ts  route.test.ts
docs/
  architecture.md
  adr/0001-stack-and-architecture.md
  adr/0002-cycle1-stream-transport.md     # + Cycle 2 prelude shape
  adr/0003-ratelimit-strategy.md
specs/
  SPEC.md
```

## Key modules

- **lib/brave.ts** — the only place that talks to Brave. Both retrieval
  functions return a normalized `Source[]` so the rest of the app is endpoint-
  agnostic. Sends the `X-Subscription-Token` header; reads `X-RateLimit-Remaining`
  and logs it.
- **lib/prompt.ts** — turns `Source[]` into numbered context and instructs the
  model to cite only from those sources using `[n]` markers. Pure functions, so
  they're cheap to unit test.
- **app/api/answer/route.ts** — orchestration only; no business logic lives
  here beyond validate → limit → retrieve → ground → stream.
- **lib/env.ts** — fails fast at startup if `BRAVE_API_KEY` /
  `ANTHROPIC_API_KEY` are missing.

## Retrieval abstraction

`endpoint: "web" | "context"` selects the Brave function. Both normalize to:

```ts
type Source = { index: number; title: string; url: string; snippet: string };
```

The UI shows the resulting source count and round-trip latency per endpoint so
the tradeoff is visible (the "wears its sourcing on its sleeve" goal).

## Streaming & citations

The AI SDK's `streamText` streams answer tokens to the client. Source metadata
(plus endpoint stats) is sent as an **NDJSON prelude** — the first newline-
delimited line of the response is `{ endpoint, retrieval_ms, source_count,
sources }` (the `AnswerPrelude` type), followed by the streamed answer text. The
client reads the prelude first to render `SourceCard`s + `StatsBar`, then
`AnswerStream` resolves inline `[n]` markers to clickable pills as text arrives.
See `docs/adr/0002` for why a prelude was chosen over AI SDK data parts.

## Runtime, secrets, deployment

- API route runs on the **Node runtime** (keeps secrets server-side; simplest
  path for the Anthropic provider).
- Secrets (`BRAVE_API_KEY`, `ANTHROPIC_API_KEY`) live only in route handlers /
  server modules — never in client components.
- Deployed on **Vercel**; env vars set in the Vercel dashboard.
- Rate limiting is in-memory/per-instance, env-configurable (`RATE_LIMIT_MAX`,
  `RATE_LIMIT_WINDOW_MS`). Every answer response carries `X-RateLimit-Limit` /
  `-Remaining` / `-Reset`; throttled requests return 429 with a structured body
  and `Retry-After`. Per-instance reset on serverless is a deliberate demo
  tradeoff — see `docs/adr/0003` for the Upstash upgrade path.
