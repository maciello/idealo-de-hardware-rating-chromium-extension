import type { Signal } from "@idealo-hw/sensors";

/** Red and amber flags: the signals worth a chip of their own. Info flags and badges stay in the card. */
export const warningsOf = (signals: readonly Signal[]): Signal[] =>
  signals.filter(
    (signal) =>
      signal.kind === "flag" && (signal.severity === "red" || signal.severity === "amber"),
  );
