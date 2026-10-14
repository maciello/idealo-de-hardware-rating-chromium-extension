import { quantity, type Sensor, type SensorInput, type Signal } from "../../signal";
import { POWER_THRESHOLDS } from "./thresholds";

export const POWER_SENSOR_ID = "power";

export const POWER_SIGNAL_IDS = {
  veryLow: "power.very_low",
  veryHigh: "power.very_high",
} as const;

type Source = "datasheet" | "benchmark";

const usable = (watts: number | null | undefined): watts is number =>
  watts !== null && watts !== undefined && Number.isFinite(watts) && watts > 0;

const tdpOf = (input: SensorInput): { watts: number; source: Source } | null => {
  if (usable(input.facts.cpuTdpWatts))
    return { watts: input.facts.cpuTdpWatts, source: "datasheet" };
  const benchmark = input.cpu?.tdpWatts;
  return usable(benchmark) ? { watts: benchmark, source: "benchmark" } : null;
};

const cpuMarkPerWatt = (watts: number, cpuMark: number | undefined): number | null =>
  cpuMark !== undefined && Number.isFinite(cpuMark) && cpuMark > 0 ? cpuMark / watts : null;

/** Badges only the extremes of CPU TDP for the device class; the middle emits nothing. */
export const powerSensor: Sensor = {
  id: POWER_SENSOR_ID,
  sense(input): Signal[] {
    if (input.deviceClass === "unknown") return [];
    const tdp = tdpOf(input);
    if (tdp === null) return [];
    const limits = POWER_THRESHOLDS[input.deviceClass];
    const veryLow = tdp.watts <= limits.veryLowMaxWatts;
    if (!veryLow && tdp.watts < limits.veryHighMinWatts) return [];
    return [
      {
        sensorId: POWER_SENSOR_ID,
        id: veryLow ? POWER_SIGNAL_IDS.veryLow : POWER_SIGNAL_IDS.veryHigh,
        kind: "badge",
        severity: "info",
        params: {
          tdpWatts: tdp.watts,
          cpuMarkPerWatt: cpuMarkPerWatt(tdp.watts, input.cpu?.cpuMark),
        },
        evidence: [
          { field: "tdp", value: quantity(tdp.watts, "W") },
          { field: "tdpSource", value: { kind: "tdp_source", source: tdp.source } },
        ],
      },
    ];
  },
};
