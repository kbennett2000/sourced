import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  BraveLlmContextResponseSchema,
  BraveWebSearchResponseSchema,
  type RetrievalResult,
} from "@/lib/types";

const WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const LLM_CONTEXT_URL = "https://api.search.brave.com/res/v1/llm/context";
const DEFAULT_COUNT = 10;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

/**
 * Brave web `description` snippets contain HTML highlight tags (`<strong>`) and
 * entities (`&#x27;`); strip them so source cards render clean text. A no-op for
 * already-plain prose.
 */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m)
    .trim();
}

/** Thrown when Brave returns a non-2xx response. Carries status + raw body. */
export class BraveError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Brave API request failed with status ${status}`);
    this.name = "BraveError";
  }
}

async function braveFetch(
  url: string,
  query: string,
): Promise<{ data: unknown; ms: number }> {
  const { BRAVE_API_KEY } = getEnv();
  const endpoint = url === WEB_SEARCH_URL ? "web" : "context";

  const target = new URL(url);
  target.searchParams.set("q", query);
  if (endpoint === "web") {
    target.searchParams.set("count", String(DEFAULT_COUNT));
  }

  const start = Date.now();
  const res = await fetch(target, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn("brave.request", {
      endpoint,
      status: res.status,
      ms: Date.now() - start,
      rateLimitRemaining: res.headers.get("X-RateLimit-Remaining"),
    });
    throw new BraveError(res.status, body);
  }

  const data = await res.json();
  // Measure the full round trip (network + body parse) for an honest retrieval_ms.
  const ms = Date.now() - start;

  logger.info("brave.request", {
    endpoint,
    status: res.status,
    ms,
    rateLimitRemaining: res.headers.get("X-RateLimit-Remaining"),
  });

  return { data, ms };
}

/** Brave Web Search → normalized sources + retrieval time (snippet = description). */
export async function webSearch(query: string): Promise<RetrievalResult> {
  const { data, ms } = await braveFetch(WEB_SEARCH_URL, query);
  const parsed = BraveWebSearchResponseSchema.safeParse(data);
  if (!parsed.success) {
    logger.warn("brave.web.parse_failed", { issues: parsed.error.issues.length });
    return { sources: [], retrievalMs: ms };
  }

  const results = parsed.data.web?.results ?? [];
  const sources = results
    .filter((r) => r.url)
    .map((r, i) => ({
      index: i + 1,
      title: stripHtml(r.title) || r.url,
      url: r.url,
      snippet: stripHtml(r.description),
    }));
  return { sources, retrievalMs: ms };
}

/** Brave LLM Context → normalized sources + retrieval time (snippet = joined chunks). */
export async function llmContext(query: string): Promise<RetrievalResult> {
  const { data, ms } = await braveFetch(LLM_CONTEXT_URL, query);
  const parsed = BraveLlmContextResponseSchema.safeParse(data);
  if (!parsed.success) {
    logger.warn("brave.context.parse_failed", {
      issues: parsed.error.issues.length,
    });
    return { sources: [], retrievalMs: ms };
  }

  const items = parsed.data.grounding?.generic ?? [];
  const sources = items
    .filter((item) => item.url)
    .map((item, i) => ({
      index: i + 1,
      title: stripHtml(item.title) || item.url,
      url: item.url,
      snippet: stripHtml(item.snippets.join(" ")),
    }));

  if (sources.length === 0) {
    logger.warn("brave.context.empty", { rawItems: items.length });
  }
  return { sources, retrievalMs: ms };
}
