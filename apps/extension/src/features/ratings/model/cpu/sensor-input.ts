import { type CpuBenchmarkRecord, classifyCpu, type FormFactor } from "@idealo-hw/hw-bench";
import type { DeviceClass, SensorInput } from "@idealo-hw/sensors";

/**
 * Same pick as hw-bench's segment_percentile: the page's device class when known, else the class the
 * CPU alone belongs to; a chip in both sets (Ryzen 7 7840HS, Apple M4) or neither stays "unknown".
 */
export function deviceClassOf(formFactor: FormFactor, cpuName: string): DeviceClass {
  if (formFactor !== "unknown") return formFactor;
  const own = classifyCpu(cpuName);
  if (own.laptop === own.desktop) return "unknown";
  return own.laptop ? "laptop" : "desktop";
}

export const sensorInputOf = (record: CpuBenchmarkRecord, formFactor: FormFactor): SensorInput => ({
  facts: {},
  cpu: {
    name: record.name,
    cpuMark: record.cpuMark,
    tdpWatts: record.tdpWatts,
    releaseYear: record.released?.year ?? null,
  },
  deviceClass: deviceClassOf(formFactor, record.name),
});
