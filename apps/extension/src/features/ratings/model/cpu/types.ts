import type { CpuBenchmarkRecord, FormFactor, RamType, Rating } from "@idealo-hw/hw-bench";
import type { Signal } from "@idealo-hw/sensors";
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
      /** System memory type the item states; null when it names none. */
      ramType: RamType | null;
      ratings: readonly Rating[];
      /** Badges and flags the product sensors raised; empty when nothing stands out. */
      signals: readonly Signal[];
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
