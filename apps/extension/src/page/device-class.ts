import type { FormFactor } from "@idealo-hw/hw-bench";
import { parseSpecBlock, productContextFromSpecs } from "@idealo-hw/hw-bench";
import type { ProductInfo } from "@idealo-hw/idealo-page";
import { filterPageOf } from "../filters/page";

/**
 * idealo category -> device class of every product in it. The one place that knows which categories
 * are laptop or desktop listings; PassMark's own category field is unreliable for this.
 */
const FORM_FACTOR_BY_CATEGORY: Readonly<Record<string, FormFactor>> = {
  "3751": "laptop", // Notebooks
  "3020": "desktop", // PC-Systeme
};

export const formFactorOfCategory = (categoryId: string): FormFactor =>
  FORM_FACTOR_BY_CATEGORY[categoryId] ?? "unknown";

/** Device class of a listing page, from the category its url, served payload or links name. */
export function listingFormFactor(url: string, doc: Document): FormFactor {
  const page = filterPageOf(url, doc);
  return page === null ? "unknown" : formFactorOfCategory(page.query.categoryId);
}

/** Device class of a product page, from its datasheet (marker rows, then title words). */
export const productFormFactor = (info: Pick<ProductInfo, "specText" | "title">): FormFactor =>
  productContextFromSpecs(parseSpecBlock(info.specText), { title: info.title }).formFactor;
