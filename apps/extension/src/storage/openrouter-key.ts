import { storage } from "@wxt-dev/storage";
import { z } from "zod";
import { NOT_CONNECTED, type OpenRouterStatus, openrouterStatusItem } from "./openrouter-status";

/**
 * BACKGROUND ONLY. The OpenRouter API key is a bearer secret: it must never be imported by content
 * scripts, UI code or anything that logs. (`chrome.storage.local` is readable from our own content
 * scripts' isolated world, so the guard is the import graph; test/openrouter-key-isolation.test.ts
 * enforces it.)
 */
export const OpenRouterCredentialsSchema = z.object({
  key: z.string().min(1),
  userId: z.string().min(1),
  obtainedAt: z.iso.datetime(),
});
export type OpenRouterCredentials = z.infer<typeof OpenRouterCredentialsSchema>;

export const openrouterKeyItem = storage.defineItem<OpenRouterCredentials | null>(
  "local:openrouterKey",
  { fallback: null, version: 1 },
);

export async function loadOpenRouterCredentials(): Promise<OpenRouterCredentials | null> {
  const parsed = OpenRouterCredentialsSchema.safeParse(await openrouterKeyItem.getValue());
  return parsed.success ? parsed.data : null;
}

/** Key first, status second: a crash in between leaves "not connected" rather than a lie. */
export async function saveOpenRouterCredentials(
  credentials: OpenRouterCredentials,
): Promise<OpenRouterStatus> {
  await openrouterKeyItem.setValue(credentials);
  const status: OpenRouterStatus = {
    connected: true,
    userId: credentials.userId,
    obtainedAt: credentials.obtainedAt,
  };
  await openrouterStatusItem.setValue(status);
  return status;
}

/** Local delete only; the key itself stays valid at openrouter.ai until the user revokes it. */
export async function clearOpenRouterCredentials(): Promise<void> {
  await openrouterStatusItem.setValue(NOT_CONNECTED);
  await openrouterKeyItem.removeValue();
}
