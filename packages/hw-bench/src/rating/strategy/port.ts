import type { CpuBenchmarkRecord, GpuBenchmarkRecord } from "../../benchmark";
import type { FormFactor } from "../../identity";

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

/** What a benchmark score is a score of. */
export type RatingMetric = "cpu_mark" | "cpu_single" | "g3d_mark";

/** The metrics a value per euro or a percentile is computed for. */
export type PointsMetric = Exclude<RatingMetric, "cpu_single">;

/** The reference set a percentile ranks against: the products of one listing, or a device class. */
export type RatingGroup = "listing" | "laptop" | "desktop";

/** Which snapshot records a percentile's reference set admits; null: no limit of that kind. */
export interface RatingCohort {
  readonly sinceYear: number | null;
  readonly minScore: number | null;
}

interface RatingBase {
  readonly strategyId: string;
  /** The exact number: the score, points per euro, or the percentile in [0, 100]. */
  readonly value: number;
}

/**
 * A rating as data: the number and the exact inputs behind it. Wording and number formats belong
 * to the consumer.
 */
export type Rating =
  | (RatingBase & {
      readonly kind: "score";
      readonly metric: RatingMetric;
      /** Name of the record the score belongs to. */
      readonly subject: string;
    })
  | (RatingBase & {
      readonly kind: "per_euro";
      readonly metric: PointsMetric;
      readonly score: number;
      readonly priceEur: number;
    })
  | (RatingBase & {
      readonly kind: "percentile";
      readonly metric: PointsMetric;
      readonly score: number;
      /** Size of the reference set. */
      readonly sampleSize: number;
      readonly group: RatingGroup;
      /** Null for a listing, which has no cohort. */
      readonly cohort: RatingCohort | null;
    });

/** Port: a pure function from typed inputs to a Rating, or null when the inputs cannot support one. */
export interface RatingStrategy<I = RatingInput> {
  readonly id: string;
  /** Catalogue name of the strategy: a static description, not derived from any rating. */
  readonly label: string;
  rate(input: I): Rating | null;
}

export type GpuRatingStrategy = RatingStrategy<GpuRatingInput>;
