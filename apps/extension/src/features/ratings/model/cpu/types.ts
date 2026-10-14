import type { CpuBenchmarkRecord, FormFactor, Rating } from "@idealo-hw/hw-bench";
import type { RatingQuery } from "../query";

export interface PageRank {
  rank: number;
  total: number;
}

export type ItemRating =
  | {
      status: "matched";
      record: CpuBenchmarkRecord;
      via: "exact" | "normalized" | "model_token";
      /** Device class the ratings were computed for; names the comparison group on the chip. */
      formFactor: FormFactor;
      ratings: readonly Rating[];
      /** Position among the matched products of the same page (1 = fastest); null below two peers. */
      pageRank: PageRank | null;
    }
  | { status: "ambiguous"; candidates: readonly CpuBenchmarkRecord[] }
  | { status: "no_match" };

export type MatchedRating = Extract<ItemRating, { status: "matched" }>;
export type AmbiguousRating = Extract<ItemRating, { status: "ambiguous" }>;

export interface StrategyInfo {
  id: string;
  label: string;
}

export interface RatingEngine {
  rate(queries: readonly RatingQuery[]): ItemRating[];
}
