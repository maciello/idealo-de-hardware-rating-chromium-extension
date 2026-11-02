export { type BenchmarkLookup, type CpuBench, type GpuBench, NO_BENCHMARKS } from "./benchmark";
export {
  AGENT_FLAGS,
  type AgentFlag,
  type Candidate,
  CandidateSchema,
  CandidatesFileSchema,
  type Offer,
} from "./candidate";
export {
  type AiMemory,
  type AiMemoryBasis,
  aiMemory,
  UNIFIED_FAST_MEMORY_PATTERN,
  webcamMegapixels,
} from "./derive";
export type { CheckValue, ExclusionReason } from "./filters";
export type { FlagParam, RedFlag } from "./flags";
export {
  HIGHER_IS_BETTER,
  LOWER_IS_BETTER,
  METRICS,
  type Metric,
  type MetricValues,
} from "./metrics";
export { bestOffer, type OfferView, shopTrust, trustedOffer } from "./offers";
export { poolCandidates } from "./pool";
export { type PriceContext, type PriceDip, type PriceTrend, priceContext } from "./price-context";
export { rankDeals } from "./rank";
export type {
  DealReport,
  ExcludedCandidate,
  LensEntry,
  LensView,
  PoolSummary,
  RankedCandidate,
} from "./report";
export type { Contribution } from "./score";
export type { Standout } from "./standouts";
export { PRODUCT_TYPE_EXAMPLES } from "./vocab";
export {
  type CustomMetricDecl,
  type Hard,
  type Lens,
  type Wants,
  WantsSchema,
} from "./wants";
