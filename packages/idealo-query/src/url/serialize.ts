import type { FilterCatalog } from "../catalog";
import type { ManufacturerId } from "../ids";
import { foldManufacturers, type IdealoQuery, type PriceRange } from "../query";
import { DEFAULT_ORIGIN } from "./constants";

export class UnrepresentableQueryError extends Error {
  constructor(readonly manufacturerIds: readonly ManufacturerId[]) {
    super(
      `Manufacturers without a web filter id cannot be put in a web URL: ${manufacturerIds.join(", ")}. Pass a catalog that maps them (searchFilterId).`,
    );
    this.name = "UnrepresentableQueryError";
  }
}

const formatBound = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));

/** idealo answers 404 to an open lower bound (p=-2000.0), so a missing min is written as 0.0. */
const formatPrice = (price: PriceRange): string =>
  `${formatBound(price.min ?? 0)}-${price.max === undefined ? "" : formatBound(price.max)}`;

/** Throws UnrepresentableQueryError if manufacturerIds remain after folding them via `catalog`. */
export function toWebUrl(
  query: IdealoQuery,
  options: { origin?: string; catalog?: FilterCatalog } = {},
): string {
  const q = foldManufacturers(query, options.catalog);
  if (q.manufacturerIds.length > 0) throw new UnrepresentableQueryError(q.manufacturerIds);

  const origin = (options.origin ?? DEFAULT_ORIGIN).replace(/\/+$/, "");
  const filters = q.filterIds.length > 0 ? `F${q.filterIds.join("-")}` : "";
  const paging = q.offset ? `I16-${q.offset}` : "";
  const path = `${origin}/preisvergleich/ProductCategory/${q.categoryId}${filters}${paging}${q.opaqueSuffix ?? ""}.html`;

  const params: string[] = [];
  if (q.price) params.push(`p=${formatPrice(q.price)}`);
  if (q.text) params.push(`q=${encodeURIComponent(q.text)}`);
  if (q.sort) params.push(`sortKey=${encodeURIComponent(q.sort)}`);
  return params.length > 0 ? `${path}?${params.join("&")}` : path;
}
