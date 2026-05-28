import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { BraveError, llmContext, webSearch } from "@/lib/brave";
import { logger } from "@/lib/logger";
import { buildPrelude } from "@/lib/prelude";
import { buildContext, buildSystemPrompt } from "@/lib/prompt";
import { checkRateLimit, type RateLimitResult } from "@/lib/ratelimit";
import { AnswerRequestSchema, type RetrievalResult } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function json(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)), // epoch seconds
  };
}

export async function POST(req: Request): Promise<Response> {
  // 1. Validate body.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = AnswerRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }
  const { question, endpoint } = parsed.data;

  // 2. Rate-limit by IP.
  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000));
    logger.warn("answer.rate_limited", { ip });
    return json(
      { error: "Rate limit exceeded. Try again later.", retryAfterSeconds },
      429,
      { ...rateLimitHeaders(rl), "Retry-After": String(retryAfterSeconds) },
    );
  }

  // Privacy (SPEC §7): never log the full query, only its length.
  logger.info("answer.request", { endpoint, questionLength: question.length });

  // 3. Retrieve sources via the selected endpoint.
  let retrieval: RetrievalResult;
  try {
    retrieval =
      endpoint === "web" ? await webSearch(question) : await llmContext(question);
  } catch (err) {
    if (err instanceof BraveError) {
      logger.error("answer.brave_error", { status: err.status });
      return json({ error: "Search provider error." }, 502);
    }
    logger.error("answer.retrieval_error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return json({ error: "Failed to retrieve sources." }, 500);
  }

  // 4. Ground + 5. stream.
  const system = buildSystemPrompt();
  const prompt = `Context:\n${buildContext(retrieval.sources)}\n\nQuestion: ${question}`;

  try {
    const result = streamText({ model: anthropic(MODEL), system, prompt });
    const encoder = new TextEncoder();
    // Prelude: endpoint stats + sources as the first NDJSON line, then text.
    const prelude = JSON.stringify(buildPrelude(endpoint, retrieval)) + "\n";

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(prelude));
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          logger.error("answer.stream_error", {
            message: err instanceof Error ? err.message : "unknown",
          });
          controller.error(err);
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        ...rateLimitHeaders(rl),
      },
    });
  } catch (err) {
    logger.error("answer.stream_setup_error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return json({ error: "Failed to generate answer." }, 500);
  }
}
