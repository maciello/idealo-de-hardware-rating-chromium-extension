import type { DeviceClass } from "../../signal";

export interface PowerThresholds {
  /** Inclusive: a TDP at or below this is very low. */
  veryLowMaxWatts: number;
  /** Inclusive: a TDP at or above this is very high. */
  veryHighMinWatts: number;
}

/** Cut the natural tails of the TDP distribution, see docs/adr/0015-product-sensors.yaml. */
export const POWER_THRESHOLDS: Readonly<Record<Exclude<DeviceClass, "unknown">, PowerThresholds>> =
  {
    laptop: { veryLowMaxWatts: 9, veryHighMinWatts: 55 },
    desktop: { veryLowMaxWatts: 35, veryHighMinWatts: 170 },
  };
