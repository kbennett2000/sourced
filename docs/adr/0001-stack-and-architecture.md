# ADR 0001 — Stack and architecture

- Status: Accepted
- Date: 2026-05-28

## Context

We need a small, fast-to-build demo of the Brave Search API for a Developer
Relations interview. Priorities, in order: (1) demonstrate product judgment,
(2) be quick to build, (3) be visually impressive and shareable as a live URL.
It is not production software and does not need breadth of features.

## Decision

Build a single-page **Next.js 15 (App Router) + React 19** app in **TypeScript
(strict)**, using the **Vercel AI SDK v6** (`ai` + `@ai-sdk/anthropic`) for LLM
streaming with model `claude-sonnet-4-6`, and the **Brave Search API** for
retrieval. Style with **Tailwind CSS v4**. Validate with **Zod**. Test with
**Vitest**. Deploy to **Vercel**. Package manager: **pnpm**. Node 20+.

Retrieval supports both `/res/v1/web/search` and `/res/v1/llm/context`, exposed
to the user via a toggle.

## Options considered

- **Next.js + Vercel AI SDK (chosen).** Matches the "developer-cult" ecosystem
  the role lives in (Vercel), streaming + tool calling with minimal plumbing,
  and one-command deploy to a live URL. Single repo, single deploy.
- **Python + FastAPI.** Strong for an API-only reference, but it would be either
  headless or need a separate frontend — less visual, no instant shareable URL,
  weaker fit for this interview's "wow" goal.
- **Raw `fetch` to the Anthropic API (no AI SDK).** Fewer deps, but we'd
  hand-roll streaming and lose the provider-swap and UI primitives that make the
  build fast. Not worth it here.

## Consequences

- Positive: fast to build, demos well, on-theme, easy to deploy and share, easy
  to extend (MCP server, more endpoints) as talking points.
- Tradeoffs: tied to the Vercel/AI SDK ecosystem; AI SDK v6 has breaking changes
  vs v5, so follow v6 docs/patterns specifically.
- The LLM Context endpoint may require a Brave plan tier that includes it —
  verify plan coverage when subscribing so the endpoint toggle works.
