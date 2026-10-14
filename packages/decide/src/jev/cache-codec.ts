import { z } from "zod";
import type { DecisionCache } from "../port";

export const CachedChoice = z.object({
  topId: z.string().nullable(),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
  model: z.string(),
});
export type CachedChoice = z.infer<typeof CachedChoice>;

export const CachedFilters = z.object({
  probabilities: z.record(z.string(), z.number()),
  model: z.string(),
});
export type CachedFilters = z.infer<typeof CachedFilters>;

export async function readCache<T>(
  cache: DecisionCache | undefined,
  key: string,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  if (cache === undefined) return undefined;
  const parsed = schema.safeParse(await cache.get(key));
  return parsed.success ? parsed.data : undefined;
}
