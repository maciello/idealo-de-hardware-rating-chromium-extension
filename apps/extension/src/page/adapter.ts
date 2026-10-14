export type PageKind = "listing" | "product" | "other";

export interface ListingItem {
  /** Element a badge is attached to; stable for as long as the page keeps the item. */
  element: Element;
  productId?: string;
  title: string;
  /** Whole-item text, whitespace-collapsed; used when the title carries no CPU. */
  text: string;
  priceEur?: number;
}

export interface ProductInfo {
  element: Element | null;
  title: string;
  specText: string;
  priceEur?: number;
}

/**
 * Port: everything the extension knows about idealo's markup. Selectors are unverified guesses
 * (see unverified_idealo_assumptions); swapping the adapter must not touch rating or UI code.
 */
export interface PageAdapter {
  readonly id: string;
  detect(url: string): PageKind;
  listingItems(root: ParentNode): ListingItem[];
  productInfo(root: ParentNode): ProductInfo | null;
}
