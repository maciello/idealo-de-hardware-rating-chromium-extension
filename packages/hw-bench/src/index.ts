export { CpuRowSchema } from "./benchmark/cpu-row";
export { GpuRowSchema } from "./benchmark/gpu-row";
export { coerceNumeric } from "./benchmark/numeric";
export type {
  BenchmarkKind,
  CpuBenchmarkRecord,
  CpuSegment,
  GpuBenchmarkRecord,
  GpuSegment,
  ReleaseDate,
} from "./benchmark/records";
export { totalCores, totalThreads } from "./benchmark/records";
export type { BenchmarkSnapshot, RejectedRow } from "./benchmark/snapshot";
export {
  BenchmarkFormatError,
  type BenchmarkSource,
  type ParseOptions,
  passmarkCpuSource,
  passmarkGpuSource,
  readRows,
} from "./benchmark/source";
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
export {
  type CpuIdentity,
  extractCpuIdentity,
  normalizeCpuName,
} from "./identity/cpu-identity";
export type { FormFactor } from "./identity/form-factor";
export {
  type CpuScoreBounds,
  cpuScoreBounds,
  type GpuScoreBounds,
  gpuScoreBounds,
  type ScoreRange,
} from "./matcher/bounds";
export { createCanonicalKeyMatcher } from "./matcher/canonical-key";
export type {
  FreeTextMatcher,
  FreeTextMatchResult,
  Matcher,
  MatchResult,
} from "./matcher/matcher";
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
