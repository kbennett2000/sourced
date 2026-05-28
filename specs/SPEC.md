# Sourced — Product Spec (v1)

> A grounded answer engine that wears its sourcing on its sleeve. Ask a
> question, get a streamed answer with inline citations and source cards,
> powered by the Brave Search API.

## 1. Why this exists

This is a portfolio/demo piece for a Brave Search API Developer Relations
interview. Its job is to **demonstrate product judgment**, not feature breadth:
it should make the value of an independent web index obvious, and show that the
builder understands *when to use which Brave endpoint*.

Two audiences:

- **The interviewer**, who should be able to open a live URL and immediately
  see a fast, well-cited answer — and notice the endpoint toggle.
- **A developer reading the repo**, who should reach "first successful call" in
  minutes via a README written like real product docs.

## 2. Core user flow

1. User types a question.
2. App calls the Brave Search API for live results.
3. Results are formatted into grounding context and passed to an LLM.
4. The answer **streams** back token-by-token with inline citation markers
   (`[1]`, `[2]`).
5. Citations map to **source cards** (title, domain, snippet, link) rendered
   alongside the answer.

## 3. The standout element: endpoint transparency

A visible toggle lets the user switch the retrieval source between:

- **Web Search** (`/res/v1/web/search`) — ranked links + snippets; you control
  formatting and how much context to pass.
- **LLM Context** (`/res/v1/llm/context`) — relevance-ranked, model-ready
  content in a single call; Brave's endpoint purpose-built for AI grounding.

The UI surfaces the difference (latency, number of sources, answer grounding)
so the demo *teaches* the tradeoff rather than hiding it. This is the single
most DevRel-relevant feature in the app.

## 4. In scope (v1)

- Single-question → grounded streaming answer with inline citations.
- Source cards tied to citation markers.
- Endpoint toggle (Web Search vs LLM Context) with a visible diff (source
  count + response latency).
- Basic per-IP rate limiting on the answer route (cost/abuse guard).
- Zod-validated env, request input, and Brave responses.
- Structured logging at module boundaries.
- Unit tests on the grounding/citation logic and the Brave client.
- A README that optimizes for time-to-first-call.
- `CUSTOMER-ZERO.md`: friction points found while building + suggested fixes.

## 5. Out of scope (v1) — deliberately

These are "where I'd take it next" talking points, not v1 work:

- Accounts / auth.
- Multi-turn conversation history or any persistence/database.
- Brave news / images / local / video endpoints.
- Exposing the app as an MCP server (strong follow-up; Brave is a leading MCP
  search tool).
- i18n, theming, mobile-native.

## 6. Success criteria

- Cold open of the live URL to a fully streamed, cited answer in a few seconds.
- A new developer can clone, add two keys, and get a local answer in < 5 min.
- The endpoint toggle produces a visible, explainable difference.
- `pnpm test` runs in under 10 seconds and passes.

## 7. Non-functional notes

- **Privacy/positioning:** lean into Brave's independent index + no query
  retention in copy. Don't log full user queries in production logs.
- **Cost surface:** public deploy runs on the owner's Brave + Anthropic keys.
  Rate limit + keep the link semi-private; budget is trivial (~$4–5 per 1k
  Brave queries; Anthropic per-token).
- **Performance:** stream first token fast; do not block the UI on full
  completion.
