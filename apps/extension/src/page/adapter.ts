export type PageKind = "listing" | "product" | "other";

export interface ListingItem {
  /** Element a badge is attached to; stable for as long as the page keeps the item. */
  element: Element;
  productId?: string;
  title: string;
  /** Spec text, whitespace-collapsed; used when the title carries no CPU. */
  text: string;
  /** Where `text` came from: the page's embedded search payload or the rendered markup. */
  textSource: "embedded" | "dom";
  priceEur?: number;
  /** `PageAdapter.id` of the adapter that found this item (the composite adapter delegates). */
  adapterId: string;
}

export interface ProductInfo {
  element: Element | null;
  title: string;
  specText: string;
  priceEur?: number;
}

/**
 * Port: everything the extension knows about idealo's markup. Swapping the adapter must not touch
 * rating or UI code. Listing selectors are verified against real server-rendered pages; product
 * page selectors are still guesses (see unverified_idealo_assumptions).
 */
export interface PageAdapter {
  readonly id: string;
  detect(url: string): PageKind;
  listingItems(root: ParentNode): ListingItem[];
  productInfo(root: ParentNode): ProductInfo | null;
}
