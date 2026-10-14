import { MAX_UNRATED, type PageInspection, type PageReport } from "../contracts";
import type { EmbeddedStatus } from "../page/embedded-listing";

const MAX_TITLE_CHARS = 200;
const MAX_TEXT_CHARS = 300;

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
