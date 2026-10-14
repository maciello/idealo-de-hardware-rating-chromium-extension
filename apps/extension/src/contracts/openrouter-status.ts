import { z } from "zod";

/**
 * What the options page may know about the OpenRouter connection. Deliberately holds no secret:
 * the key lives in `platform/storage/openrouter-key.ts` and is only ever read by the background
 * service worker.
 */
export const OpenRouterStatusSchema = z.object({
  connected: z.boolean(),
  userId: z.string().nullable(),
  obtainedAt: z.iso.datetime().nullable(),
});
export type OpenRouterStatus = z.infer<typeof OpenRouterStatusSchema>;

export const NOT_CONNECTED: OpenRouterStatus = {
  connected: false,
  userId: null,
  obtainedAt: null,
};
