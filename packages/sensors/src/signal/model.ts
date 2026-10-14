import type { ProductFacts } from "../facts";
import type { Evidence } from "./evidence";
import type { SignalId, SignalParamsById } from "./params";

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

/** What a sensor found, as data only: wording and number formats belong to the consumer. */
export interface Signal<K extends SignalId = SignalId> {
  sensorId: string;
  id: K;
  kind: "badge" | "flag";
  severity: "red" | "amber" | "info";
  /** The figures the id's wording needs. */
  params: SignalParamsById[K];
  /** The product facts the signal rests on, when stated. */
  evidence: Evidence[];
}

export interface Sensor {
  id: string;
  sense(input: SensorInput): Signal[];
}
