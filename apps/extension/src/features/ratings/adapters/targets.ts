import { listingFormFactor, type PageAdapter, type PageKind } from "@idealo-hw/idealo-page";
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

/** One target per listing tile. */
const listingTargets = (adapter: PageAdapter): Target[] => {
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
};

/** The product's own heading, when the page has one. */
const productTargets = (adapter: PageAdapter): Target[] => {
  const info = adapter.productInfo(document);
  if (!info?.element) return [];
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
};

/** What each kind of page offers to carry a chip. */
const COLLECTORS: Readonly<Record<PageKind, (adapter: PageAdapter) => Target[]>> = {
  listing: listingTargets,
  product: productTargets,
  other: () => [],
};

/** Reads the current page: one target per listing tile, or the product's own heading. */
export const collectTargets = (adapter: PageAdapter): Target[] =>
  COLLECTORS[adapter.detect(location.href)](adapter);
