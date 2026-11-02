import type { CpuBench, GpuBench } from "./benchmark";
import type { AgentFlag } from "./candidate";
import type { AiMemoryBasis } from "./derive";
import type { ExclusionReason } from "./filters";
import type { RedFlag } from "./flags";
import type { MetricValues } from "./metrics";
import type { OfferView } from "./offers";
import type { PriceContext } from "./price-context";
import type { Contribution } from "./score";
import type { Standout } from "./standouts";
import type { CustomMetricDecl } from "./wants";

export interface RankedCandidate {
  rank: number;
  sku: string;
  name: string;
  url: string;
  product_type: string;
  /** CPU and GPU text as the candidate gave it. */
  cpu: string | null;
  gpu: string | null;
  /** 0..100, relative to the eligible set. */
  score: number;
  contributions: Contribution[];
  /** Metric values the ranking used; a metric without a value is absent. */
  metrics: MetricValues;
  /** ai_memory_gb is an estimate; this says how it was derived. */
  ai_memory_basis: AiMemoryBasis;
  best_offer: OfferView;
  trusted_offer: OfferView | null;
  cpu_benchmark: CpuBench | null;
  gpu_benchmark: GpuBench | null;
  price_context: PriceContext | null;
  standouts: Standout[];
  /** Derived laptop features and agent-listed features the candidate has. */
  features: string[];
  /** The subset of features that at most a third of the eligible candidates have. */
  rare_features: string[];
  red_flags: RedFlag[];
  found_by: string[];
  agent_flags: AgentFlag[];
  /** Notes written by the agent. */
  notes: string[];
  /** Notes written by the ranking: missing values, ambiguous benchmark matches. */
  system_notes: string[];
}

export interface ExcludedCandidate {
  sku: string;
  name: string;
  url: string;
  reasons: ExclusionReason[];
}

export interface LensEntry {
  sku: string;
  name: string;
  rank: number;
  score: number;
}

export interface LensView {
  id: string;
  label: string;
  /** Pooled candidates this lens found, eligible or not. */
  found: number;
  eligible: number;
  /** Best three eligible candidates this lens found. */
  top: LensEntry[];
}

export interface PoolSummary {
  candidates: number;
  eligible: number;
  excluded: number;
  lenses: number;
}

export interface DealReport {
  summary: PoolSummary;
  top_n: number;
  /** Every eligible candidate in rank order; the first top_n are the shortlist. */
  ranked: RankedCandidate[];
  excluded: ExcludedCandidate[];
  lens_view: LensView[];
  /** found_by ids that no wants lens defines. */
  unknown_lens_ids: string[];
  /** Metric keys that carried weight in the score (feature metrics are `feature:<name>`). */
  weighted_metrics: string[];
  /** Declared custom metrics, for labels. */
  custom_metrics: CustomMetricDecl[];
}
