import { valuesOf } from "../values-signature";
import type { ItemRating } from "./types";

export const cpuSignatureOf = (rating: ItemRating): string => {
  if (rating.status === "matched") {
    const rank = rating.pageRank ? `${rating.pageRank.rank}/${rating.pageRank.total}` : "-";
    const signals = rating.signals.map((s) => s.id).join(",");
    return `m:${rating.record.id}:${rating.formFactor}:${rating.ramType?.label ?? "-"}:${valuesOf(rating.ratings)}:${rank}:${signals}`;
  }
  return rating.status === "ambiguous" ? `a:${rating.candidates.map((c) => c.id).join(",")}` : "n";
};
