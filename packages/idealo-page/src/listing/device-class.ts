import { filterPageOf } from "./filter-page";

/** Device class of a listing's products; structurally the same set hw-bench calls a form factor. */
export type ListingDeviceClass = "laptop" | "desktop" | "unknown";

/**
 * idealo category -> device class of every product in it. The one place that knows which categories
 * are laptop or desktop listings; PassMark's own category field is unreliable for this.
 */
const DEVICE_CLASS_BY_CATEGORY: Readonly<Record<string, ListingDeviceClass>> = {
  "3751": "laptop", // Notebooks
  "3020": "desktop", // PC-Systeme
};

export const formFactorOfCategory = (categoryId: string): ListingDeviceClass =>
  DEVICE_CLASS_BY_CATEGORY[categoryId] ?? "unknown";

/** Device class of a listing page, from the category its url, served payload or links name. */
export function listingFormFactor(url: string, doc: Document): ListingDeviceClass {
  const page = filterPageOf(url, doc);
  return page === null ? "unknown" : formFactorOfCategory(page.query.categoryId);
}
