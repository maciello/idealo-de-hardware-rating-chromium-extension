import { type CpuBenchmarkRecord, classifyCpu, type FormFactor } from "@idealo-hw/hw-bench";
import type { DeviceClass, SensorClock, SensorInput } from "@idealo-hw/sensors";
import type { RatingQuery } from "../query";
import { factsOf } from "./facts";

/**
 * Same pick as hw-bench's segment_percentile: the page's device class when known, else the class the
 * CPU alone belongs to; a chip in both sets (Ryzen 7 7840HS, Apple M4) or neither stays "unknown".
 * Without a matched CPU only the page can say.
 */
export function deviceClassOf(formFactor: FormFactor, cpuName: string | null): DeviceClass {
  if (formFactor !== "unknown" || cpuName === null) return formFactor;
  const own = classifyCpu(cpuName);
  if (own.laptop === own.desktop) return "unknown";
  return own.laptop ? "laptop" : "desktop";
}

/** What the sensors see of one item: its facts, the matched CPU when there is one, and the device class. */
export const sensorInputOf = (
  query: RatingQuery,
  record: CpuBenchmarkRecord | null,
  now: SensorClock,
): SensorInput => ({
  facts: factsOf(query),
  cpu:
    record === null
      ? null
      : {
          name: record.name,
          cpuMark: record.cpuMark,
          tdpWatts: record.tdpWatts,
          releaseYear: record.released?.year ?? null,
        },
  deviceClass: deviceClassOf(query.formFactor ?? "unknown", record?.name ?? null),
  now,
});
