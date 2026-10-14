import { POWER_SENSOR_ID, POWER_SIGNAL_IDS, type Signal } from "@idealo-hw/sensors";
import type { MatchedRating } from "../../model";

export interface PowerBadge {
  level: "low" | "high";
  /** Icon title and accessible name. */
  label: string;
}

export const powerSignalOf = (rating: MatchedRating): Signal | undefined =>
  rating.signals.find((s) => s.sensorId === POWER_SENSOR_ID);

export const powerBadgeOf = (rating: MatchedRating): PowerBadge | null => {
  const signal = powerSignalOf(rating);
  return signal
    ? { level: signal.id === POWER_SIGNAL_IDS.veryLow ? "low" : "high", label: signal.label }
    : null;
};
