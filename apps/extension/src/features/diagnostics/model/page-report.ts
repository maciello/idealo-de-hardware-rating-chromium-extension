import type { EmbeddedStatus } from "@idealo-hw/idealo-page";
import { MAX_UNRATED, type PageInspection, type PageReport } from "../../../contracts";
import { MAX_TEXT_CHARS, MAX_TITLE_CHARS } from "../config";

export function buildPageReport(
  url: string,
  inspection: PageInspection,
  embedded: EmbeddedStatus,
): PageReport {
  const { items } = inspection;
  return {
    url,
    kind: inspection.kind,
    adapterId: items[0]?.adapterId ?? null,
    tiles: items.length,
    tilesWithProductId: items.filter((item) => item.productId !== null).length,
    tilesMatchedToPayload: items.filter((item) => item.textSource === "embedded").length,
    tilesRated: items.filter((item) => item.rated).length,
    unrated: items
      .filter((item) => !item.rated)
      .slice(0, MAX_UNRATED)
      .map(({ title, text }) => ({
        title: title.slice(0, MAX_TITLE_CHARS),
        text: text.slice(0, MAX_TEXT_CHARS),
      })),
    payload: {
      present: embedded.listing !== null,
      categoryId: embedded.listing?.categoryId ?? null,
      resultCount: embedded.listing?.page.resultCount ?? null,
      error: embedded.error,
    },
  };
}
