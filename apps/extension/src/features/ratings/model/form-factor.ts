import { type FormFactor, parseSpecBlock, productContextFromSpecs } from "@idealo-hw/hw-bench";
import type { ProductInfo } from "@idealo-hw/idealo-page";

/** Device class of a product page, from its datasheet (marker rows, then title words). */
export const productFormFactor = (info: Pick<ProductInfo, "specText" | "title">): FormFactor =>
  productContextFromSpecs(parseSpecBlock(info.specText), { title: info.title }).formFactor;
