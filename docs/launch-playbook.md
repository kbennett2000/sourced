# Launch playbook

If this were a real Brave-published reference, here's how I'd ship the
surrounding content. This is thinking-out-loud about the work *around* the
code — the part that decides whether a good demo actually moves developers —
not a proposal anyone asked for. Numbers and hooks below are drawn from the app
itself (e.g. the Web-vs-LLM-Context source-count and `retrieval_ms` diff) so the
content stays concrete rather than generic.

---

## 1. The artifact mix

The repo is the anchor. Each artifact below points back to it and leads with the
one idea worth remembering: *Brave gives you two retrieval endpoints, and which
one you pick is a real engineering decision.*

- **Blog post (on the Brave blog): "Two endpoints, one toggle: when to reach for
  Brave's LLM Context API."** Opens with a screenshot of the stats bar — same
  question, Web Search returns 10 sources, LLM Context returns 11–15, with
  `retrieval_ms` side by side — then explains *why* the counts and latency
  differ. Ends with a decision tree: reach for Web Search when you want to
  control chunking/formatting or show source diversity; reach for LLM Context
  when you want model-ready grounding in one call and will accept denser,
  mixed-format chunks. ~1,200 words, one diagram, links to the live demo.

- **Runnable notebook (StackBlitz, not Colab): "Grounded answers in 30 lines."**
  StackBlitz over Colab because this is a TypeScript/Next.js stack, not Python —
  a Colab would misrepresent the ecosystem. Strips the app to a single route
  calling `webSearch()` then `streamText()`, so a developer hits a cited answer
  without cloning anything. The hook: "Add your Brave key, press run, watch it
  cite."

- **3-minute Loom: "The toggle, and why it exists."** Screen-record flipping
  between endpoints on one question, narrating the stats-bar diff and the
  collapsed-snippet handling. No slides. The point is to show the tradeoff
  moving in real time — the thing a static README can't.

- **X thread (5 tweets).** See Launch day below; the thread *is* the artifact.

- **LinkedIn post.** A more measured framing of the same idea for an audience of
  eng leaders deciding on a search/RAG vendor (see Launch day).

---

## 2. Launch day

One question runs through every channel: *which Brave endpoint should you use,
and why?* Each channel gets a different on-ramp to it.

### X thread (5 tweets)

1. **Hook:** "Brave Search has two retrieval endpoints for AI apps. I built a
   demo that runs your question through both, side by side, and shows the diff.
   Here's what I learned about when to use which. 🧵" — attach the stats-bar
   screenshot.
2. The web-vs-context numbers from a real query (source count + `retrieval_ms`),
   with the live link.
3. Web Search: you own chunking/formatting; best for control + source diversity.
4. LLM Context: model-ready grounding in one call; denser, sometimes mixed
   formats (show the collapsed-JSON snippet shot).
5. "Repo + live demo + a CUSTOMER-ZERO doc on the rough edges I hit." Link.

### Hacker News — "Show HN: Sourced — a Brave Search API demo that shows the Web Search vs LLM Context tradeoff"

Honest, technical framing in the first comment: what it is, what it deliberately
*isn't* (no auth, no DB, in-memory rate limiting), the one design decision worth
discussing (NDJSON prelude vs AI SDK data parts — link ADR 0002), and an explicit
invitation to push back on the endpoint-choice heuristics. No superlatives. HN
rewards the build log, not the pitch.

### LinkedIn

Frame for decision-makers, not just builders: "Choosing a search API for a RAG
product is a tradeoff between control and convenience. Here's that tradeoff made
visible, with latency and source-count numbers from a working app." Link the
blog post, not the repo — LinkedIn readers want the narrative first.

### Brave community / Discord intro

"Built a small open reference for the Search API that puts Web Search and LLM
Context behind one toggle so the tradeoff is visible. Also wrote up six friction
points I hit (CUSTOMER-ZERO.md) — would love to know which are already on the
roadmap and which are me holding it wrong." Lead with the contribution and a
genuine question, not a self-promo drop.

---

## 3. Follow-on content (next 4–8 weeks)

- **Measured-comparison blog: "Web Search vs LLM Context: 50 queries, real
  numbers."** Run a fixed query set through both endpoints, log `source_count`,
  `retrieval_ms`, and answer groundedness; publish the table and the script. Moves
  the claim from "here's a toggle" to "here's the data." This is the post that
  earns links.

- **Livestream / Discord office hours (45 min).** Build a second endpoint live
  (e.g. add news results), take questions, triage one real issue on air. Recurring
  beats one-off — even monthly signals the project is alive.

- **MCP server companion repo: `sourced-mcp`.** Wrap the grounded-answer flow as
  an MCP tool so Claude/other agents can call Brave-grounded search directly.
  Brave is already a leading MCP search backend, so this rides existing demand;
  the companion repo links back here as the "how it works under the hood."

- **Podcast pitch.** Two real fits: **Latent Space** (latent.space) — they go
  deep on AI engineering, RAG, and retrieval, and an independent-index-vs-the-
  incumbents angle suits their audience; and **The Changelog** — an open-source
  reference app with an honest CUSTOMER-ZERO writeup matches their builder-story
  format. Pitch the *story* (independent search index as RAG infrastructure), not
  the repo.

---

## 4. Community engagement

A reference repo lives or dies on whether the first external contributor has a
good time.

- **Issue handling.** Triage within ~48h on weekdays — even just a label + one
  question. Labels: `bug`, `question`, `docs`, `good first issue`,
  `help wanted`, `brave-api` (issues that are really upstream API/DX feedback,
  which get forwarded, not closed).
- **What "good first issue" means here.** Scoped to one file, no architecture
  decision required, with the acceptance check named in the issue. Concrete
  starters: add a copy-link button to `SourceCard`, add a loading aria-live
  region, add a unit test for a `classifySnippet` edge case. Each is <30 lines
  and has an obvious "done."
- **PR triage.** First response within ~48h. Every PR must keep `pnpm typecheck`,
  `pnpm lint`, and the (~1s) test suite green — stated in CONTRIBUTING so it's not
  a surprise. Small PRs merged fast; large ones get a design comment before code
  review, so nobody sinks a weekend into a direction that won't land.

---

## 5. Metrics that matter

Stars are a vanity metric — they measure reach, not whether anyone shipped on
Brave. Track these instead, each paired with the decision it informs:

- **Time-to-first-call.** The single most important number for a reference repo.
  Instrument it honestly: a stopwatch in the quickstart ("clone → first cited
  answer") run on a clean machine each release, plus a one-line optional
  telemetry ping the *quickstart script* can emit on first successful `/api/answer`
  (opt-in). If it creeps above ~5 minutes, the setup steps are the bug — fix docs
  before features.
- **Brave-tagged questions in Discord/issues.** Volume and theme of questions
  mentioning the Search API. Rising volume on one theme (e.g. LLM Context shape)
  → that's the next blog post or doc PR, not a guess.
- **Attributable signups (blog UTM).** Brave API signups from
  `?utm_source=sourced` links. This is the only metric that ties content to the
  business outcome; if a post drives signups, write its sequel — if it drives
  traffic but no signups, the call-to-action is wrong.
- **Repeat contributors.** One-time PRs are nice; a second PR from the same
  person means the contribution experience worked. If it's always first-and-done,
  the `good first issue` pipeline or review turnaround needs attention.

The thread that ties these together: every metric should change *what gets built
or written next*. A number that wouldn't change a decision isn't worth tracking.
