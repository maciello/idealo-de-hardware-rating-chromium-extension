import { storage } from "@wxt-dev/storage";
import { withLock } from "../../../platform/locks";
import { RING_CAPACITY } from "../config";
import { type CapturedResponse, CapturedResponseSchema } from "../model/protocol";

type SlotKey = `local:capture:${number}`;

const slotKey = (sequence: number): SlotKey => `local:capture:${sequence % RING_CAPACITY}`;
const headItem = storage.defineItem<number>("local:captureHead", { fallback: 0, version: 1 });

/** Serialises read-modify-write of the head counter across tabs (all idealo tabs share one origin). */
const withRingLock = <T>(task: () => Promise<T>): Promise<T> =>
  withLock("idealo-hw-capture-ring", task);

/**
 * Ring buffer of captured responses, one storage key per slot so an append rewrites one entry
 * (<= 1 MB) rather than the whole buffer. Slot = sequence % capacity; `head` counts all appends.
 */
export const captureRing = {
  append: (entry: CapturedResponse): Promise<void> =>
    withRingLock(async () => {
      const head = await headItem.getValue();
      await storage.setItem(slotKey(head), entry);
      await headItem.setValue(head + 1);
    }),

  /** Oldest first; entries that fail validation are dropped. */
  async list(): Promise<CapturedResponse[]> {
    const head = await headItem.getValue();
    const first = Math.max(0, head - RING_CAPACITY);
    const keys = Array.from({ length: head - first }, (_, i) => slotKey(first + i));
    const found = await storage.getItems(keys);
    const byKey = new Map(found.map(({ key, value }) => [key, value]));
    return keys.flatMap((key) => {
      const parsed = CapturedResponseSchema.safeParse(byKey.get(key));
      return parsed.success ? [parsed.data] : [];
    });
  },

  async count(): Promise<number> {
    return Math.min(await headItem.getValue(), RING_CAPACITY);
  },

  watch: (callback: () => void) => headItem.watch(callback),

  clear: (): Promise<void> =>
    withRingLock(async () => {
      const keys = Array.from({ length: RING_CAPACITY }, (_, i) => slotKey(i));
      await storage.removeItems(keys);
      await headItem.removeValue();
    }),
};
