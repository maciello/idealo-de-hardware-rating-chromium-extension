import { storage } from "@wxt-dev/storage";
import { z } from "zod";

export const MAX_ERRORS = 50;
const MAX_MESSAGE_CHARS = 500;
const STACK_LINES = 5;
/** OpenRouter keys; an error message that echoes one must not reach the log. */
const KEY_PATTERN = /sk-or-[\w-]+/g;

export const ErrorEntrySchema = z.object({
  at: z.iso.datetime(),
  where: z.enum(["background", "content", "options", "popup"]),
  message: z.string(),
  /** First lines of the stack; empty when the thrown value had none. */
  stack: z.string(),
});
export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;
export type ErrorSource = ErrorEntry["where"];

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

/**
 * Serialises read-modify-write among contexts of one origin (all idealo tabs; all extension pages).
 * Content scripts and extension pages have different origins, so an entry can still be lost when
 * both write at the same instant: acceptable for a diagnostic log.
 */
const withLock = async <T>(task: () => Promise<T>): Promise<T> =>
  globalThis.navigator?.locks ? await navigator.locks.request("idealo-hw-error-log", task) : task();

/** Appends to the persistent log (newest last, at most MAX_ERRORS). Never throws: it runs inside error handlers. */
export function recordError(where: ErrorSource, error: unknown, now = new Date()): Promise<void> {
  const entry = entryOf(where, error, now);
  return withLock(async () => {
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

const EXTENSION_ORIGIN = "chrome-extension://";

/**
 * Logs uncaught errors and unhandled rejections of this context. A content script shares the page's
 * window object but only sees events from its own world; the extension-url check keeps anything that
 * is not ours out regardless.
 */
export function installGlobalErrorReporting(
  where: ErrorSource,
  target: EventTarget = globalThis,
): void {
  const ours = (...traces: (string | undefined)[]): boolean =>
    where !== "content" || traces.some((trace) => trace?.includes(EXTENSION_ORIGIN));
  target.addEventListener("error", (event) => {
    const { error, message, filename } = event as ErrorEvent;
    if (ours(filename, error instanceof Error ? error.stack : undefined)) {
      void recordError(where, error ?? message);
    }
  });
  target.addEventListener("unhandledrejection", (event) => {
    const { reason } = event as PromiseRejectionEvent;
    if (ours(reason instanceof Error ? reason.stack : undefined)) void recordError(where, reason);
  });
}
