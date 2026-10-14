import { z } from "zod";
import { parseGermanPrice } from "../../german-price";
import type { ProductInfo } from "../../port";
import { collapse } from "../../text";
import { ADAPTER_ID, MAX_SPEC_CHARS, PRICE, SPEC_SELECTORS } from "./selectors";

const ProductJsonSchema = z.object({
  name: z.string().optional(),
  offers: z
    .union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())])
    .optional(),
});

const priceNumber = z.coerce.number().positive();

function readProductJson(root: ParentNode): { title?: string; priceEur?: number } {
  const script = root.querySelector('script[data-testid="Product"]');
  if (!script?.textContent) return {};
  let json: unknown;
  try {
    json = JSON.parse(script.textContent);
  } catch {
    return {};
  }
  const product = ProductJsonSchema.safeParse(json);
  if (!product.success) return {};
  const offer = Array.isArray(product.data.offers) ? product.data.offers[0] : product.data.offers;
  const price = priceNumber.safeParse(offer?.lowPrice ?? offer?.price);
  return {
    ...(product.data.name ? { title: product.data.name } : {}),
    ...(price.success ? { priceEur: price.data } : {}),
  };
}

function specTextOf(root: ParentNode): string {
  const specs = [...root.querySelectorAll(SPEC_SELECTORS)].map((n) => collapse(n.textContent));
  const text =
    specs.length > 0
      ? specs.join(" ")
      : collapse((root.querySelector("main") ?? root.querySelector("body"))?.textContent);
  return text.slice(0, MAX_SPEC_CHARS);
}

/** Low price from the product script, else the page's price node. */
export const productPriceOf = (root: ParentNode): number | undefined =>
  readProductJson(root).priceEur ??
  parseGermanPrice(collapse(root.querySelector(PRICE)?.textContent), true);

export function heuristicProductInfo(root: ParentNode): ProductInfo | null {
  const json = readProductJson(root);
  const heading = root.querySelector("h1");
  const title = json.title ?? collapse(heading?.textContent);
  if (title === "") return null;
  const priceEur = productPriceOf(root);
  return {
    element: heading,
    title,
    specText: specTextOf(root),
    adapterId: ADAPTER_ID,
    ...(priceEur === undefined ? {} : { priceEur }),
  };
}
