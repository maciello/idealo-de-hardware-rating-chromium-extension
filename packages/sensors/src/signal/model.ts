import type { ProductFacts } from "./facts";

export type DeviceClass = "laptop" | "desktop" | "unknown";

/** The matched benchmark CPU, mapped by the caller from its own record type. */
export interface SensorCpu {
  name: string;
  cpuMark: number;
  tdpWatts: number | null;
  releaseYear: number | null;
}

/** The clock, injected so sensors stay pure. */
export interface SensorClock {
  year: number;
}

export interface SensorInput {
  facts: ProductFacts;
  cpu: SensorCpu | null;
  deviceClass: DeviceClass;
  now: SensorClock;
}

export interface Evidence {
  field: string;
  value: string;
}

export interface Signal {
  sensorId: string;
  id: string;
  kind: "badge" | "flag";
  severity: "red" | "amber" | "info";
  label: string;
  detail: string;
  evidence: Evidence[];
}

export interface Sensor {
  id: string;
  sense(input: SensorInput): Signal[];
}
