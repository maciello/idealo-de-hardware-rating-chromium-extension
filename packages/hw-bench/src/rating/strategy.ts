import type { CpuBenchmarkRecord, GpuBenchmarkRecord } from "../benchmark/records";
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

/** GPU counterpart of `RatingInput`. For an ambiguous match the caller passes the weakest candidate (see `rateGpuMatch`). */
export interface GpuRatingInput {
  readonly gpu: GpuBenchmarkRecord;
  /** Price of the whole listing, not of the GPU. */
  readonly priceEur?: number;
  /** Device class of the listing; absent or "unknown" leaves the percentile strategy without a cohort. */
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
export interface RatingStrategy<I = RatingInput> {
  readonly id: string;
  readonly label: string;
  rate(input: I): Rating | null;
}

export type GpuRatingStrategy = RatingStrategy<GpuRatingInput>;
