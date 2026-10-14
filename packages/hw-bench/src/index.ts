export type {
  BenchmarkKind,
  BenchmarkSnapshot,
  CpuBenchmarkRecord,
  CpuSegment,
  GpuBenchmarkRecord,
  GpuSegment,
  RejectedRow,
  ReleaseDate,
} from "./benchmark";
export {
  BenchmarkFormatError,
  type BenchmarkSource,
  CpuRowSchema,
  coerceNumeric,
  GpuRowSchema,
  type ParseOptions,
  passmarkCpuSource,
  passmarkGpuSource,
  readRows,
  totalCores,
  totalThreads,
} from "./benchmark";
export {
  type Candidate,
  type CandidateIndex,
  type CandidateIndexOptions,
  type CandidatesOptions,
  createCandidateIndex,
  DEFAULT_CANDIDATE_LIMIT,
  isModelNumberLike,
  tokenize,
} from "./candidates";
export {
  extractGpuIdentity,
  type GpuIdentity,
  normalizeGpuName,
} from "./gpu/identity";
export { createGpuMatcher, type GpuMatcher, type GpuMatchOptions } from "./gpu/matcher";
export type { FormFactor } from "./identity";
export {
  type CpuIdentity,
  extractCpuIdentity,
  normalizeCpuName,
} from "./identity";
export type {
  FreeTextMatcher,
  FreeTextMatchResult,
  Matcher,
  MatchResult,
} from "./matcher";
export {
  type CpuScoreBounds,
  cpuScoreBounds,
  createCanonicalKeyMatcher,
  type GpuScoreBounds,
  gpuScoreBounds,
  type ScoreRange,
} from "./matcher";
export {
  type Cohort,
  type CohortPolicy,
  CohortPolicySchema,
  createCohort,
  type DatedRecord,
  DEFAULT_COHORT_POLICY,
  describeCohort,
} from "./rating/cohort";
export { createStrategies, defaultStrategies } from "./rating/defaults";
export {
  classifyCpu,
  classifyGpu,
  type DeviceClass,
  type DeviceMembership,
} from "./rating/device-class";
export {
  createGpuStrategies,
  type GpuMatchRating,
  type GpuRateOptions,
  g3dScore,
  gpuDefaultStrategies,
  gpuValuePerEuro,
  rateGpuMatch,
} from "./rating/gpu";
export { GPU_PERCENTILE_ID, gpuPercentile } from "./rating/gpu-percentile";
export {
  type CohortPercentileInput,
  cohortPercentileRating,
  percentileDisplay,
  percentileRank,
} from "./rating/percentile";
export { segmentPercentile } from "./rating/segment-percentile";
export {
  multiThreadScore,
  peerPercentile,
  type ScoreStrategySpec,
  scoreStrategy,
  singleThreadScore,
  type ValuePerEuroSpec,
  valuePerEuro,
  valuePerEuroStrategy,
} from "./rating/strategies";
export type {
  GpuRatingInput,
  GpuRatingStrategy,
  PeerSample,
  Rating,
  RatingInput,
  RatingStrategy,
} from "./rating/strategy";
export {
  DESKTOP_TITLE_WORDS,
  LAPTOP_TITLE_WORDS,
  type ProductContext,
  type ProductContextOptions,
  parseSpecBlock,
  productContextFromSpecs,
  SPEC_LABELS,
} from "./specs/specs";
