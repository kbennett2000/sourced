# Customer Zero

Friction encountered while building Sourced against the Brave Search API (and the
surrounding stack), with suggested fixes. These are real issues hit during
development, not hypotheticals — written from the perspective of a developer
reaching "first successful call." Two of the six (items 4 and 6) are about the
surrounding stack — the Vercel AI SDK and pnpm — rather than Brave itself;
they're kept here for honesty about what time-to-first-call actually felt like.

---

### 1. LLM Context response shape is under-documented

**Issue:** For `/res/v1/web/search` the response shape (`web.results[]` with
`title` / `url` / `description`) is easy to find and stable. For
`/res/v1/llm/context` it was much harder to pin down what the JSON actually looks
like — I ended up calling the endpoint live and inspecting the payload to confirm
it's `grounding.generic[]` with `{ url, title, snippets[] }`. Writing a typed,
validated client against docs alone wasn't possible. I wrote a tolerant Zod
schema (`lib/types.ts`) so the client survives shape drift, but a published
schema would have made that defensive layer unnecessary.

**Fix:** Publish a complete, copy-pasteable response schema + a real example for
`/llm/context`, at parity with the web-search docs. A JSON Schema or TypeScript
type would let developers validate confidently on day one.

---

### 2. LLM Context snippet content mixes prose with raw JSON / tables

**Issue:** `grounding.generic[].snippets[]` are typed as strings, but in practice
some are clean prose while others are serialized JSON or table-like text (e.g.
`{"title":"...","table":[{"Data Type":"Web Search",...}]}`). Rendering snippets
naively shows raw JSON to users. I had to write a heuristic classifier
(`lib/snippet.ts`) to detect non-prose chunks and render them collapsed.

**Fix:** Tag each snippet with a `kind` (`"prose" | "table" | "json" | "code"`),
or document clearly that snippet content is heterogeneous so consumers know to
handle it. A structured `kind` field would remove the guesswork entirely.

---

### 3. Rate-limit headers use an undocumented multi-window format

**Issue:** `X-RateLimit-Remaining` came back as `"49, 0"` — a comma-separated
list (per-second and per-month windows, per `X-RateLimit-Policy`). A developer
naively doing `parseInt(header)` gets a misleading single number, and the format
isn't obvious from the header name alone.

**Fix:** Call out the multi-window comma-separated format prominently in the
rate-limiting guide, with a parsing example that maps each value to its window
via `X-RateLimit-Policy`.

---

### 4. AI SDK provider version is hard to match to the core version

**Issue:** Building on the Vercel AI SDK v6 (`ai@6`), it was non-obvious which
`@ai-sdk/anthropic` version to install. Initial research pointed at
`@ai-sdk/anthropic@^1`, which is the v4-era line; the version that actually
matches AI SDK v6 is `@ai-sdk/anthropic@3`. Installing the wrong major silently
mismatches the core API surface.

**Fix:** (Vercel AI SDK, not Brave.) A visible compatibility matrix —
"`ai@6` → `@ai-sdk/anthropic@3` / `@ai-sdk/react@3`" — in the provider docs and
migration guide would prevent the wrong-major trap.

---

### 5. Plan-to-endpoint coverage is easy to miss

**Issue:** Which endpoints a subscription includes (Web Search vs LLM Context,
across the Search vs Answers plans) is clear on the marketing/pricing page but
easy to overlook when you're heads-down in the API dashboard provisioning a key.
It's the kind of thing you discover when a call 4xxs.

**Fix:** Surface "endpoints included in this plan" directly on the dashboard's
subscription/key view, not only on the pricing page.

---

### 6. pnpm blocked install on ignored build scripts (build-DX, not Brave)

**Issue:** A fresh `pnpm install` exited non-zero with
`ERR_PNPM_IGNORED_BUILDS` for `sharp` and `unrs-resolver` (pnpm's default
security gate on postinstall scripts). The error reads like a failure even though
packages were installed, and the resolution (`allowBuilds` in
`pnpm-workspace.yaml`) isn't obvious to someone new to recent pnpm.

**Fix:** (Tooling note, captured for completeness.) Documenting the expected
`allowBuilds` entries in the README setup steps — or pinning the approved build
scripts in the repo — smooths first-clone setup. Already handled here via
`pnpm-workspace.yaml`.
