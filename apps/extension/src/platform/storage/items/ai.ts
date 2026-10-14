import { storage } from "@wxt-dev/storage";
import {
  type AiTestResult,
  AiTestResultSchema,
  NOT_CONNECTED,
  type OpenRouterStatus,
  OpenRouterStatusSchema,
} from "../../../contracts";

export const aiTestResultItem = storage.defineItem<AiTestResult | null>("local:aiTestResult", {
  fallback: null,
  version: 1,
});

export const openrouterStatusItem = storage.defineItem<OpenRouterStatus>("local:openrouterStatus", {
  fallback: NOT_CONNECTED,
  version: 1,
});

/** Stored result re-validated on read; null when never run or unreadable. */
export async function loadAiTestResult(): Promise<AiTestResult | null> {
  const parsed = AiTestResultSchema.nullable().safeParse(await aiTestResultItem.getValue());
  return parsed.success ? parsed.data : null;
}

export async function loadOpenRouterStatus(): Promise<OpenRouterStatus> {
  const parsed = OpenRouterStatusSchema.safeParse(await openrouterStatusItem.getValue());
  return parsed.success ? parsed.data : NOT_CONNECTED;
}
