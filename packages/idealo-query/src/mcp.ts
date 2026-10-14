import type { IdealoQuery } from "./model";
import { normalizeQuery } from "./model";

export type McpCountry = "DE" | (string & {});

export interface McpSearchArgs {
  query: string;
  country?: McpCountry;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    includeCategories?: string[];
    includeManufacturers?: string[];
    includeSearchFilters?: string[];
  };
}

/**
 * `query.text` wins over `fallbackQuery`; the MCP `query` argument is mandatory and must be non-blank.
 * Sort, offset and opaqueSuffix have no MCP counterpart and are dropped.
 */
export function toMcpSearchArgs(
  query: IdealoQuery,
  options: { fallbackQuery: string; country?: McpCountry },
): McpSearchArgs {
  const q = normalizeQuery(query);
  const text = (q.text ?? options.fallbackQuery).trim();
  if (text === "") throw new Error("toMcpSearchArgs needs query.text or a non-blank fallbackQuery");

  const filters: NonNullable<McpSearchArgs["filters"]> = {
    includeCategories: [q.categoryId],
    ...(q.price?.min === undefined ? {} : { minPrice: Math.floor(q.price.min) }),
    ...(q.price?.max === undefined ? {} : { maxPrice: Math.ceil(q.price.max) }),
    ...(q.manufacturerIds.length > 0 ? { includeManufacturers: [...q.manufacturerIds] } : {}),
    ...(q.filterIds.length > 0 ? { includeSearchFilters: [...q.filterIds] } : {}),
  };
  return { query: text, country: options.country ?? "DE", filters };
}
