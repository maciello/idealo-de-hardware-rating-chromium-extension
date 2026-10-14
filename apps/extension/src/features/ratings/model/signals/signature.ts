import type { Signal } from "@idealo-hw/sensors";

/** Every field of a signal that a chip or card renders, as one stable string. */
export const signalsSignatureOf = (signals: readonly Signal[]): string =>
  signals.map((s) => `${s.id}:${s.severity}:${s.label}:${s.detail}`).join(",");
