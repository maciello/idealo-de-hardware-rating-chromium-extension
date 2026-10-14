import type { CpuBenchmarkRecord } from "../benchmark/records";
import type { FormFactor } from "../identity/form-factor";

/** Another listing's CPU, supplied by the caller as comparison context. */
export interface PeerSample {
  readonly cpuMark: number;
  readonly priceEur?: number;
}

export interface RatingInput {
  readonly cpu: CpuBenchmarkRecord;
  readonly priceEur?: number;
  readonly peers?: readonly PeerSample[];
  /** Device class of the listing the CPU was found in; absent or "unknown" leaves device-class strategies on the CPU's own PassMark segment. */
  readonly formFactor?: FormFactor;
}

export interface Rating {
  readonly strategyId: string;
  readonly value: number;
  /** Short badge text. */
  readonly display: string;
  readonly explanation: string;
}

/** Port: a pure function from typed inputs to a Rating, or null when the inputs cannot support one. */
export interface RatingStrategy {
  readonly id: string;
  readonly label: string;
  rate(input: RatingInput): Rating | null;
}
