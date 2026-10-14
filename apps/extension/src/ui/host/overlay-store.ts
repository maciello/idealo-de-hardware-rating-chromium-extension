import type { ReactNode } from "react";

export interface OverlayEntry {
  id: string;
  node: ReactNode;
  /** Render into this element (a chip host in a tile) instead of directly in the overlay. */
  into: HTMLElement | undefined;
}

/** The overlay's entries as an external store, so one React root can follow them. */
export function createOverlayStore() {
  let entries: readonly OverlayEntry[] = [];
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const listener of listeners) listener();
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    snapshot: () => entries,
    set(entry: OverlayEntry): void {
      entries = entries.some((e) => e.id === entry.id)
        ? entries.map((e) => (e.id === entry.id ? entry : e))
        : [...entries, entry];
      emit();
    },
    remove(id: string): void {
      if (!entries.some((e) => e.id === id)) return;
      entries = entries.filter((e) => e.id !== id);
      emit();
    },
  };
}

export type OverlayStore = ReturnType<typeof createOverlayStore>;
