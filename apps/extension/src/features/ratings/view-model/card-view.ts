import type { Signal } from "@idealo-hw/sensors";
import { formatImportDate } from "../../../ui/format";
import { RATINGS_COPY } from "../copy";
import type { AmbiguousRating, GpuReading, MatchedRating } from "../model";
import type { CardRow } from "./card-row";
import { cardRows } from "./cpu/card";
import { type GpuCardSection, gpuCardSections } from "./gpu/card";
import { type SignalsCardView, signalsCardOf } from "./signals";

export type CpuCardView =
  | { kind: "ambiguous"; title: string; sub: string; candidates: { id: number; name: string }[] }
  | { kind: "matched"; title: string; sub: string; rows: CardRow[] };

export interface CardView {
  /** Null when only the GPU was recognised. */
  cpu: CpuCardView | null;
  gpuSections: GpuCardSection[];
  /** The product's flags and features; either list is empty when the product has none. */
  signals: SignalsCardView;
  footer: string;
}

const cpuCardOf = (
  rating: MatchedRating | AmbiguousRating | null,
  signals: readonly Signal[],
): CpuCardView | null => {
  if (rating === null) return null;
  if (rating.status === "ambiguous") {
    return {
      kind: "ambiguous",
      title: RATINGS_COPY.ambiguousTitle,
      sub: RATINGS_COPY.ambiguousSub,
      candidates: rating.candidates.map(({ id, name }) => ({ id, name })),
    };
  }
  return {
    kind: "matched",
    title: rating.record.name,
    sub: RATINGS_COPY.matchedSub,
    rows: cardRows(rating, signals),
  };
};

/** What the card under a chip says: the CPU block, the GPU blocks, the product's signals and the import footnote. */
export const cardViewOf = (
  rating: MatchedRating | AmbiguousRating | null,
  gpu: GpuReading | null,
  signals: readonly Signal[],
  importedAt: string | null,
): CardView => ({
  cpu: cpuCardOf(rating, signals),
  gpuSections: gpu === null ? [] : gpuCardSections(gpu),
  signals: signalsCardOf(signals),
  footer: RATINGS_COPY.importNote(formatImportDate(importedAt)),
});
