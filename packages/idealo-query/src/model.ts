import { z } from "zod";
import { CategoryIdSchema, FilterIdSchema, ManufacturerIdSchema, unique } from "./ids";

export const KNOWN_SORT_KEYS = ["minPrice"] as const;
export type SortKey = (typeof KNOWN_SORT_KEYS)[number] | (string & {});

export const MAX_PRICE = 1_000_000_000;
export const MAX_OFFSET = 1_000_000_000;

const SortKeySchema = z.string().min(1) as z.ZodType<SortKey>;

const PriceBoundSchema = z.number().min(0).max(MAX_PRICE);
export const PriceRangeSchema = z.object({
  min: PriceBoundSchema.optional(),
  max: PriceBoundSchema.optional(),
});
export type PriceRange = z.infer<typeof PriceRangeSchema>;

const isUrlEncodable = (value: string): boolean => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const TextSchema = z.string().refine(isUrlEncodable, "text must be well-formed Unicode");

const OpaqueSuffixSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9]*$/)
  .refine((value) => !/^F\d/.test(value), "opaque suffix must not look like a filter list");

export const IdealoQuerySchema = z.object({
  categoryId: CategoryIdSchema,
  filterIds: z.array(FilterIdSchema),
  manufacturerIds: z.array(ManufacturerIdSchema),
  price: PriceRangeSchema.optional(),
  sort: SortKeySchema.optional(),
  offset: z.number().int().min(0).max(MAX_OFFSET).optional(),
  text: TextSchema.optional(),
  opaqueSuffix: OpaqueSuffixSchema.optional(),
});
export type IdealoQuery = z.infer<typeof IdealoQuerySchema>;

const roundCents = (value: number): number => Math.round(value * 100) / 100 + 0;

function normalizePrice(price: PriceRange | undefined): PriceRange | undefined {
  if (!price) return undefined;
  let min = price.min === undefined ? undefined : roundCents(price.min);
  let max = price.max === undefined ? undefined : roundCents(price.max);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  // Prices are never negative, so min 0 constrains nothing and is dropped (one form per meaning).
  if (min === 0) min = undefined;
  if (min === undefined && max === undefined) return undefined;
  return {
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

export function emptyQuery(categoryId: IdealoQuery["categoryId"]): IdealoQuery {
  return { categoryId, filterIds: [], manufacturerIds: [] };
}

/**
 * Canonical form: ids deduplicated (first occurrence wins, order kept), price rounded to cents
 * with min <= max and min 0 removed, blank text/sort and offset 0 removed.
 */
export function normalizeQuery(query: IdealoQuery): IdealoQuery {
  const price = normalizePrice(query.price);
  const text = query.text?.trim();
  return {
    categoryId: query.categoryId,
    filterIds: unique(query.filterIds),
    manufacturerIds: unique(query.manufacturerIds),
    ...(price ? { price } : {}),
    ...(query.sort ? { sort: query.sort } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
    ...(text ? { text } : {}),
    ...(query.opaqueSuffix ? { opaqueSuffix: query.opaqueSuffix } : {}),
  };
}
