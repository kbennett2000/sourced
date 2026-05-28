import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  BraveLlmContextResponseSchema,
  BraveWebSearchResponseSchema,
  type Source,
} from "@/lib/types";

const WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const LLM_CONTEXT_URL = "https://api.search.brave.com/res/v1/llm/context";
const DEFAULT_COUNT = 10;

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

async function braveFetch(url: string, query: string): Promise<unknown> {
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

  logger.info("brave.request", {
    endpoint,
    status: res.status,
    ms: Date.now() - start,
    rateLimitRemaining: res.headers.get("X-RateLimit-Remaining"),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new BraveError(res.status, body);
  }

  return res.json();
}

/** Brave Web Search → normalized Source[] (snippet = result description). */
export async function webSearch(query: string): Promise<Source[]> {
  const json = await braveFetch(WEB_SEARCH_URL, query);
  const parsed = BraveWebSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn("brave.web.parse_failed", { issues: parsed.error.issues.length });
    return [];
  }

  const results = parsed.data.web?.results ?? [];
  return results
    .filter((r) => r.url)
    .map((r, i) => ({
      index: i + 1,
      title: r.title || r.url,
      url: r.url,
      snippet: r.description,
    }));
}

/** Brave LLM Context → normalized Source[] (snippet = joined content chunks). */
export async function llmContext(query: string): Promise<Source[]> {
  const json = await braveFetch(LLM_CONTEXT_URL, query);
  const parsed = BraveLlmContextResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn("brave.context.parse_failed", {
      issues: parsed.error.issues.length,
    });
    return [];
  }

  const items = parsed.data.grounding?.generic ?? [];
  const sources = items
    .filter((item) => item.url)
    .map((item, i) => ({
      index: i + 1,
      title: item.title || item.url,
      url: item.url,
      snippet: item.snippets.join(" "),
    }));

  if (sources.length === 0) {
    logger.warn("brave.context.empty", { rawItems: items.length });
  }
  return sources;
}
