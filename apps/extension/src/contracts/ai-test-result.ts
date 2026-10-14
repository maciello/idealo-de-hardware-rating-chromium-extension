import { z } from "zod";

/**
 * Outcome of the "Test AI matching" probe. Deliberately holds no secret: the options page, the popup
 * and the debug report read it, while the key stays with the background
 * (`platform/storage/openrouter-key.ts`).
 */
export const AiTestResultSchema = z.object({
  ok: z.boolean(),
  /** When the probe started, ISO-8601 UTC. */
  at: z.iso.datetime(),
  /** Label of the candidate the decider picked; null when it picked none or the call failed. */
  picked: z.string().nullable(),
  /** Label of the candidate that is the right answer. */
  expected: z.string(),
  confidence: z.number().nullable(),
  latencyMs: z.number().int().nonnegative(),
  /** Model id as reported by the response (the dated snapshot OpenRouter served). */
  model: z.string().nullable(),
  /** Why `ok` is false; never contains the key. */
  error: z.string().nullable(),
});
export type AiTestResult = z.infer<typeof AiTestResultSchema>;
