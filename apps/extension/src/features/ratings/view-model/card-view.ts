import { formatImportDate } from "../../../ui/format";
import { RATINGS_COPY } from "../copy";
import type { AmbiguousRating, GpuReading, MatchedRating } from "../model";
import type { CardRow } from "./card-row";
import { cardRows } from "./cpu/card";
import { type GpuCardSection, gpuCardSections } from "./gpu/card";

export type CpuCardView =
  | { kind: "ambiguous"; title: string; sub: string; candidates: { id: number; name: string }[] }
  | { kind: "matched"; title: string; sub: string; rows: CardRow[] };

export interface CardView {
  /** Null when only the GPU was recognised. */
  cpu: CpuCardView | null;
  gpuSections: GpuCardSection[];
  footer: string;
}

const cpuCardOf = (rating: MatchedRating | AmbiguousRating | null): CpuCardView | null => {
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
    rows: cardRows(rating),
  };
};

/** What the card under a chip says: the CPU block, the GPU blocks and the import footnote. */
export const cardViewOf = (
  rating: MatchedRating | AmbiguousRating | null,
  gpu: GpuReading | null,
  importedAt: string | null,
): CardView => ({
  cpu: cpuCardOf(rating),
  gpuSections: gpu === null ? [] : gpuCardSections(gpu),
  footer: RATINGS_COPY.importNote(formatImportDate(importedAt)),
});
