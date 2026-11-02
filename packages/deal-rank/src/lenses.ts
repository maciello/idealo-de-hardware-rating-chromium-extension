import type { Candidate } from "./candidate";
import type { LensEntry, LensView } from "./report";
import type { Scored } from "./score";
import type { Lens } from "./wants";

const TOP_PER_LENS = 3;

/** For each lens: how many pooled candidates it found, and its best three eligible ones. */
export function lensView(
  lenses: readonly Lens[],
  candidates: readonly Candidate[],
  ranked: readonly Scored[],
): LensView[] {
  return lenses.map((lens) => {
    const eligible = ranked.flatMap((scored, index): LensEntry[] =>
      scored.item.candidate.found_by.includes(lens.id)
        ? [
            {
              sku: scored.item.candidate.sku,
              name: scored.item.candidate.name,
              rank: index + 1,
              score: scored.score,
            },
          ]
        : [],
    );
    return {
      id: lens.id,
      label: lens.label,
      found: candidates.filter((candidate) => candidate.found_by.includes(lens.id)).length,
      eligible: eligible.length,
      top: eligible.slice(0, TOP_PER_LENS),
    };
  });
}
