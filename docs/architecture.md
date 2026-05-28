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
   │  2. rate-limit by IP
   │  3. retrieve via lib/brave.ts  ──►  Brave Search API
   │        - webSearch()    → /res/v1/web/search
   │        - llmContext()   → /res/v1/llm/context
   │  4. build grounding context + system prompt (lib/prompt.ts)
   │  5. streamText({ model: anthropic("claude-sonnet-4-6"), ... })
   ▼
Streamed response (answer tokens + source metadata)
   ▼
Browser renders streaming answer + SourceCards, keyed by citation index
```

## Directory shape

```
app/
  layout.tsx              # root layout
  page.tsx                # the single-page UI (client component)
  api/
    answer/route.ts       # POST handler: retrieve → ground → stream
components/
  QueryInput.tsx          # question box + submit
  EndpointToggle.tsx      # Web Search vs LLM Context switch
  AnswerStream.tsx        # renders streamed answer, parses [n] markers
  SourceCard.tsx          # one citation source
  StatsBar.tsx            # latency + source count (the "diff")
lib/
  brave.ts                # Brave client: webSearch(), llmContext(), normalize()
  prompt.ts               # system prompt + context builder + citation rules
  ratelimit.ts            # simple per-IP limiter
  logger.ts               # structured logging wrapper
  env.ts                  # Zod-validated environment variables
  types.ts                # shared types + Zod schemas (Source, AnswerRequest)
tests/
  brave.test.ts
  prompt.test.ts
docs/
  architecture.md
  adr/0001-stack-and-architecture.md
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
is sent alongside the stream (as data parts / response headers) so `AnswerStream`
can resolve `[n]` markers to `SourceCard`s as text arrives.

## Runtime, secrets, deployment

- API route runs on the **Node runtime** (keeps secrets server-side; simplest
  path for the Anthropic provider).
- Secrets (`BRAVE_API_KEY`, `ANTHROPIC_API_KEY`) live only in route handlers /
  server modules — never in client components.
- Deployed on **Vercel**; env vars set in the Vercel dashboard.
- Rate limiting is in-memory/per-instance for v1 (documented upgrade path:
  Upstash Ratelimit for durable cross-instance limits).
