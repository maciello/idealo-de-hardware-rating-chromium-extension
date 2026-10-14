import type { PageStats } from "../../contracts";
import type { TargetTab } from "../../platform/tabs";
import { POPUP_COPY } from "./copy";

export type PageStatus = PageStats | null | "loading";

export function pageSummary(tab: TargetTab | null, stats: PageStatus): string {
  if (tab === null || stats === null) return POPUP_COPY.openIdealoPage;
  if (stats === "loading") return POPUP_COPY.readingPage;
  if (stats.kind === "product") {
    return stats.rated > 0 ? POPUP_COPY.productRated : POPUP_COPY.productUnrated;
  }
  if (stats.kind !== "listing") return POPUP_COPY.openIdealoPage;
  if (stats.total === 0) return POPUP_COPY.noProducts;
  return POPUP_COPY.listingRated(stats.rated, stats.total);
}
