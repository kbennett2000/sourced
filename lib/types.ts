import { z } from "zod";

/** A normalized search result, endpoint-agnostic. `index` is 1-based. */
export const SourceSchema = z.object({
  index: z.number().int().positive(),
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});
export type Source = z.infer<typeof SourceSchema>;

/** The retrieval endpoints exposed by the app. */
export type Endpoint = "web" | "context";

/** Request body for POST /api/answer. */
export const AnswerRequestSchema = z.object({
  question: z.string().trim().min(1, "question is required").max(400, "question is too long"),
  endpoint: z.enum(["web", "context"]),
});
export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

/**
 * Brave /res/v1/web/search — we validate only the fields we consume. Zod strips
 * unknown keys, so extra response fields are ignored rather than rejected.
 */
const BraveWebResultSchema = z.object({
  title: z.string().default(""),
  url: z.string().default(""),
  description: z.string().default(""),
});
export const BraveWebSearchResponseSchema = z.object({
  web: z
    .object({
      results: z.array(BraveWebResultSchema).default([]),
    })
    .optional(),
});

/**
 * Brave /res/v1/llm/context — response shape is less certain than web search, so
 * every nested field is optional/defaulted. A wrong assumption yields zero
 * sources (graceful) rather than a thrown error.
 */
const BraveContextItemSchema = z.object({
  url: z.string().default(""),
  title: z.string().default(""),
  snippets: z.array(z.string()).default([]),
});
export const BraveLlmContextResponseSchema = z.object({
  grounding: z
    .object({
      generic: z.array(BraveContextItemSchema).default([]),
    })
    .optional(),
});
