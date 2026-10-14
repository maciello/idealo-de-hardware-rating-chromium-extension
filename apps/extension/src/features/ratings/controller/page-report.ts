import type { PageKind } from "@idealo-hw/idealo-page";
import type { PageInspection, PageStats } from "../../../contracts";
import { isRated } from "../model";
import type { TileRating } from "./types";

export interface PageReport {
  /** The popup's counts: products found, products with a rating. */
  stats: PageStats;
  /** The debug report's per-item view of what was read and whether it was rated. */
  inspection: PageInspection;
}

/** What one scan tells the popup and the debug report; pure, so the scan itself stays about IO. */
export function pageReportOf(
  kind: PageKind,
  total: number,
  results: readonly TileRating[],
): PageReport {
  return {
    stats: { kind, total, rated: results.filter(isRated).length },
    inspection: {
      kind,
      items: results.map((result) => ({ ...result.target.seen, rated: isRated(result) })),
    },
  };
}
