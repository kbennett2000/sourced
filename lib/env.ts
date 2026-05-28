import { z } from "zod";

const envSchema = z.object({
  BRAVE_API_KEY: z.string().min(1, "BRAVE_API_KEY is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  // Per-IP rate limit (optional; sensible demo defaults).
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validates and returns required environment variables. Lazy + memoized: it
 * runs on first call (e.g. the first request), not at import time, so unit
 * tests can import server modules without real keys present. Throws a clear
 * error listing every missing/invalid variable.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }

  cached = parsed.data;
  return cached;
}
