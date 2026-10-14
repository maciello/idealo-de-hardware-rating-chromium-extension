import type {
  CandidateIndex,
  CpuBenchmarkRecord,
  GpuBenchmarkRecord,
  GpuMatcher,
  Matcher,
} from "@idealo-hw/hw-bench";
import type { Decider } from "../port";

export type ResolutionSource = "deterministic" | "jev" | "none";

export interface Resolution<R> {
  readonly status: "matched" | "ambiguous" | "no_match";
  /** Set when `status` is "matched". */
  readonly record?: R;
  /** Set when `status` is "ambiguous": the deterministic matcher's tied records. */
  readonly candidates?: readonly R[];
  /** 1 for a deterministic match; the decider's confidence when it was consulted; else 0. */
  readonly confidence: number;
  /** Who produced the record: the rules, the decider (a pick above threshold), or nobody. */
  readonly source: ResolutionSource;
  /** Set whenever a decider was consulted. */
  readonly model?: string;
}

interface ResolveBase {
  readonly decider: Decider;
  /** Extra facts for the decider's state, e.g. `{ product_title: "..." }`. */
  readonly context?: Readonly<Record<string, string>>;
  /** Candidates handed to the decider after a no_match. Default 20: fewer options, fewer wrong picks. */
  readonly maxCandidates?: number;
}

export interface ResolveCpuDeps extends ResolveBase {
  readonly matcher: Matcher<CpuBenchmarkRecord>;
  readonly candidates: CandidateIndex<CpuBenchmarkRecord>;
}

export interface ResolveGpuDeps extends ResolveBase {
  readonly matcher: GpuMatcher;
  readonly candidates: CandidateIndex<GpuBenchmarkRecord>;
}

export const DEFAULT_MAX_CANDIDATES = 20;
