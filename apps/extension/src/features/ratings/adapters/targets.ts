import { listingFormFactor, type PageAdapter } from "@idealo-hw/idealo-page";
import type { InspectedItem } from "../../../contracts";
import { productFormFactor, type RatingQuery } from "../model";
import type { ChipPlacement } from "./chip-host";

/** One element of the page that can carry a chip, with what the adapter read from it. */
export interface Target {
  element: Element;
  query: RatingQuery;
  placement: ChipPlacement;
  /** What the adapter read, for the debug report. */
  seen: Omit<InspectedItem, "rated">;
}

/** Reads the current page: one target per listing tile, or the product's own heading. */
export function collectTargets(adapter: PageAdapter): Target[] {
  const kind = adapter.detect(location.href);
  if (kind === "listing") {
    const formFactor = listingFormFactor(location.href, document);
    return adapter.listingItems(document).map((item) => ({
      element: item.element,
      placement: "corner",
      query: {
        title: item.title,
        text: item.text,
        priceEur: item.priceEur,
        formFactor,
        characteristics: item.characteristics,
      },
      seen: {
        adapterId: item.adapterId,
        productId: item.productId ?? null,
        textSource: item.textSource,
        title: item.title,
        text: item.text,
      },
    }));
  }
  if (kind === "product") {
    const info = adapter.productInfo(document);
    if (info?.element) {
      return [
        {
          element: info.element,
          placement: "inline",
          query: {
            title: info.title,
            text: info.specText,
            priceEur: info.priceEur,
            formFactor: productFormFactor(info),
            datasheet: info.specText,
          },
          seen: {
            adapterId: info.adapterId,
            productId: null,
            textSource: "dom",
            title: info.title,
            text: info.specText,
          },
        },
      ];
    }
  }
  return [];
}
