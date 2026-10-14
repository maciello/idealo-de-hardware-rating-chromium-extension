import { POWER_SENSOR_ID, POWER_SIGNAL_IDS, type Signal } from "@idealo-hw/sensors";

export interface PowerBadge {
  level: "low" | "high";
  /** Icon title and accessible name. */
  label: string;
}

export const powerSignalOf = (signals: readonly Signal[]): Signal | undefined =>
  signals.find((s) => s.sensorId === POWER_SENSOR_ID);

export const powerBadgeOf = (signals: readonly Signal[]): PowerBadge | null => {
  const signal = powerSignalOf(signals);
  return signal
    ? { level: signal.id === POWER_SIGNAL_IDS.veryLow ? "low" : "high", label: signal.label }
    : null;
};
