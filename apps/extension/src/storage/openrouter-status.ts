import { storage } from "@wxt-dev/storage";
import { z } from "zod";

/**
 * What the options page may know about the OpenRouter connection. Deliberately holds no secret:
 * the key lives in `openrouter-key.ts` and is only ever read by the background service worker.
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

export const openrouterStatusItem = storage.defineItem<OpenRouterStatus>("local:openrouterStatus", {
  fallback: NOT_CONNECTED,
  version: 1,
});

export async function loadOpenRouterStatus(): Promise<OpenRouterStatus> {
  const parsed = OpenRouterStatusSchema.safeParse(await openrouterStatusItem.getValue());
  return parsed.success ? parsed.data : NOT_CONNECTED;
}
