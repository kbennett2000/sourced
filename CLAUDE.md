# CLAUDE.md

Operating rules for Claude Code on this project. Read fully before working.
Read `/specs/` and `/docs/` (including `/docs/adr/`) before starting any task.

## Project overview

Sourced is a grounded answer engine: ask a question, get a streamed answer with
inline citations and source cards, powered by the Brave Search API. It is a
demo/portfolio piece for a Brave Search API DevRel interview — optimized to
show product judgment (especially the Web Search vs LLM Context endpoint
tradeoff), not feature breadth.

## Tech stack

- Next.js 15 (App Router) + React 19
- TypeScript 5.x, strict mode
- Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`); model `claude-sonnet-4-6`
- Brave Search API (REST): `/res/v1/web/search` and `/res/v1/llm/context`
- Zod (validation), Tailwind CSS v4 (styling)
- Vitest (unit tests)
- pnpm, Node 20+
- Deploy: Vercel

## Architecture

- Single page UI in `app/page.tsx`; one API route in `app/api/answer/route.ts`.
- `lib/brave.ts` is the ONLY module that calls Brave; both retrieval functions
  return a normalized `Source[]`.
- `lib/prompt.ts` builds numbered grounding context + citation rules (pure,
  testable functions).
- `lib/env.ts` Zod-validates env and fails fast on missing keys.
- API route is orchestration only: validate → rate-limit → retrieve → ground →
  stream. No business logic beyond that.
- See `/docs/architecture.md` for the full shape and request flow.

## Conventions

- React components: PascalCase files in `components/` (e.g. `SourceCard.tsx`).
- Library modules: camelCase files in `lib/` (e.g. `brave.ts`).
- Prefer named exports. Default exports only where Next requires them
  (`page.tsx`, `layout.tsx`); route handlers export named HTTP methods (`POST`).
- Absolute imports via the `@/` path alias; no deep relative chains.
- Validate everything crossing a boundary with Zod: env, request body, and
  Brave API responses. Define schemas in `lib/types.ts`.
- Secrets live only in server code (route handlers, `lib/*` used server-side).
  Never reference keys in client components.
- Unit tests colocate as `*.test.ts` or live in `tests/`; keep them fast.

## Out of scope for v1

Do not build these unless explicitly asked:

- Accounts / authentication.
- Multi-turn chat history, persistence, or any database.
- Brave news / images / local / video endpoints.
- MCP server packaging.
- i18n, theming, mobile-native.

## Git Workflow

After any code change is complete and verified (tests pass / lint clean /
feature works), do the following without being asked:

1. `git add -A` to stage all changes
2. Commit with a concise conventional-commit message
   (e.g. `feat: add user auth middleware`, `fix: handle empty cart edge case`,
   `refactor: extract validation into shared module`, `docs: update README`)
3. `git push` to push to origin/main

Commit at logical checkpoints — a complete feature, a bug fix, a refactor —
not after every individual file edit. If a task spans multiple commits,
make each commit independently meaningful and atomic.

If `git push` fails (auth, conflict, network), surface the full error to the
user immediately. Do not retry silently or attempt destructive resolutions
(no `--force`, no resetting branches).

Never commit secrets, API keys, .env files, or anything matching .gitignore.

## Engineering Principles

### Tests are required, not optional
- Every new feature, bug fix, or non-trivial change ships with tests.
- For new functionality, prefer test-first: write the test from the spec,
  then implement until it passes.
- A task is not "done" until the relevant tests pass. Do not report completion
  with failing or skipped tests.
- When fixing a bug, first write a test that reproduces the bug (and fails),
  then fix it. This prevents regressions.
- Keep the test suite fast. If a test is slow, isolate it (mark as integration
  or e2e) so the default `test` command stays under 10 seconds for unit tests.

### Tight feedback loops
- Use strict typing everywhere (TypeScript strict mode / Pydantic / Zod —
  whatever the stack supports). Type errors should surface immediately.
- Run lint and typecheck before declaring a task complete.
- Add structured logging at module boundaries from day one. When something
  breaks, logs should narrow the cause in seconds, not minutes.
- If a change requires manual verification (UI, integrations), state exactly
  what to check and how — don't leave it implicit.

### Spec before code for non-trivial work
- For any task touching 3+ files, introducing a new module, or changing a
  contract between components: produce a spec FIRST in plan mode. Do not
  start editing until the user has approved the plan.
- For significant architectural decisions, write a short ADR (Architecture
  Decision Record) in `/docs/adr/` capturing: context, options considered,
  decision, consequences. Reference the ADR in commit messages.
- Read `/docs/` and `/specs/` (if they exist) before starting work. Those
  files describe intent; the code describes implementation. Both matter.

### Taste and restraint
- Prefer the simplest solution that solves the problem. Resist adding
  abstraction, config options, or framework features that aren't justified
  by an actual requirement.
- If a diff is getting large, stop and ask whether the task should be
  decomposed into smaller commits.
- Reuse existing patterns in the codebase before inventing new ones.
