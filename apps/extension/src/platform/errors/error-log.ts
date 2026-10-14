import { storage } from "@wxt-dev/storage";
import { type ErrorEntry, ErrorEntrySchema } from "../../contracts";
import { withLock } from "../locks";

export const MAX_ERRORS = 50;
const MAX_MESSAGE_CHARS = 500;
const STACK_LINES = 5;
/** OpenRouter keys; an error message that echoes one must not reach the log. */
const KEY_PATTERN = /sk-or-[\w-]+/g;

export type ErrorSource = ErrorEntry["where"];

/**
 * Content scripts and extension pages have different origins, so an entry can still be lost when
 * both write at the same instant: acceptable for a diagnostic log.
 */
const ERROR_LOG_LOCK = "idealo-hw-error-log";

const errorLogItem = storage.defineItem<ErrorEntry[]>("local:errorLog", {
  fallback: [],
  version: 1,
});

const scrub = (text: string): string => text.replace(KEY_PATTERN, "[key]");

function entryOf(where: ErrorSource, error: unknown, now: Date): ErrorEntry {
  const thrown = error instanceof Error ? error : undefined;
  return {
    at: now.toISOString(),
    where,
    message: scrub(thrown?.message ?? String(error)).slice(0, MAX_MESSAGE_CHARS),
    stack: scrub((thrown?.stack ?? "").split("\n").slice(0, STACK_LINES).join("\n")),
  };
}

/** Appends to the persistent log (newest last, at most MAX_ERRORS). Never throws: it runs inside error handlers. */
export function recordError(where: ErrorSource, error: unknown, now = new Date()): Promise<void> {
  const entry = entryOf(where, error, now);
  return withLock(ERROR_LOG_LOCK, async () => {
    const current = await readErrorLog();
    await errorLogItem.setValue([...current, entry].slice(-MAX_ERRORS));
  }).catch(() => undefined);
}

/** Oldest first; entries that fail validation are dropped. */
export async function readErrorLog(): Promise<ErrorEntry[]> {
  const stored = await errorLogItem.getValue();
  return Array.isArray(stored)
    ? stored.flatMap((entry) => {
        const parsed = ErrorEntrySchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
}
