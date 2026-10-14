import { z } from "zod";
import {
  type CategoryId,
  CategoryIdSchema,
  type FilterId,
  FilterIdSchema,
  type ManufacturerId,
  ManufacturerIdSchema,
} from "./ids";

const CountSchema = z.number().int().min(0);

export const FilterOptionSchema = z.object({
  filterId: FilterIdSchema,
  label: z.string(),
  count: CountSchema.optional(),
});
export type FilterOption = z.infer<typeof FilterOptionSchema>;

export const FilterGroupSchema = z.object({
  attributeId: z.string().min(1),
  name: z.string(),
  filters: z.array(FilterOptionSchema),
});
export type FilterGroup = z.infer<typeof FilterGroupSchema>;

export const ManufacturerSchema = z.object({
  manufacturerId: ManufacturerIdSchema,
  name: z.string(),
  count: CountSchema.optional(),
  searchFilterId: FilterIdSchema.optional(),
});
export type Manufacturer = z.infer<typeof ManufacturerSchema>;

export const FilterCatalogSchema = z.object({
  categoryId: CategoryIdSchema,
  groups: z.array(FilterGroupSchema),
  manufacturers: z.array(ManufacturerSchema),
});
export type FilterCatalog = z.infer<typeof FilterCatalogSchema>;

const numericString = z.union([z.string(), z.number().int().nonnegative()]).transform(String);

const McpFilterSchema = z.object({
  filterId: numericString.pipe(FilterIdSchema),
  content: z.string(),
  amount: CountSchema.optional(),
});

const McpAttributeSchema = z.object({
  attributeId: numericString.pipe(z.string().min(1)),
  name: z.string(),
  filters: z.array(McpFilterSchema),
});

const McpManufacturerSchema = z.object({
  manufacturerId: numericString.pipe(ManufacturerIdSchema),
  manufacturerName: z.string(),
  amount: CountSchema.optional(),
  searchFilterId: numericString.pipe(FilterIdSchema).optional(),
});

const McpResponseSchema = z
  .object({
    availableFilters: z.array(McpAttributeSchema).optional(),
    availableManufacturers: z.array(McpManufacturerSchema).optional(),
  })
  .refine(
    (r) => r.availableFilters !== undefined || r.availableManufacturers !== undefined,
    "response has neither availableFilters nor availableManufacturers",
  );

/** Throws ZodError on a malformed response. The MCP response carries no category id, so it is passed in. */
export function parseMcpSearchResponseCatalog(
  json: unknown,
  categoryId: CategoryId,
): FilterCatalog {
  const response = McpResponseSchema.parse(json);
  return {
    categoryId,
    groups: (response.availableFilters ?? []).map((attribute) => ({
      attributeId: attribute.attributeId,
      name: attribute.name,
      filters: attribute.filters.map((f) => ({
        filterId: f.filterId,
        label: f.content,
        ...(f.amount === undefined ? {} : { count: f.amount }),
      })),
    })),
    manufacturers: (response.availableManufacturers ?? []).map((m) => ({
      manufacturerId: m.manufacturerId,
      name: m.manufacturerName,
      ...(m.amount === undefined ? {} : { count: m.amount }),
      ...(m.searchFilterId === undefined ? {} : { searchFilterId: m.searchFilterId }),
    })),
  };
}

export interface FilterLookup {
  group: FilterGroup;
  filter: FilterOption;
  groupPosition: number;
}

export interface CatalogIndex {
  readonly catalog: FilterCatalog;
  filter(id: FilterId): FilterLookup | undefined;
  group(attributeId: string): FilterGroup | undefined;
  manufacturer(id: ManufacturerId): Manufacturer | undefined;
  manufacturerBySearchFilterId(id: FilterId): Manufacturer | undefined;
}

const indexCache = new WeakMap<FilterCatalog, CatalogIndex>();

/** O(1) lookups; memoized per catalog object, so treat catalogs as immutable. First occurrence wins on duplicate ids. */
export function indexCatalog(catalog: FilterCatalog): CatalogIndex {
  const cached = indexCache.get(catalog);
  if (cached) return cached;

  const filters = new Map<FilterId, FilterLookup>();
  const groups = new Map<string, FilterGroup>();
  catalog.groups.forEach((group, groupPosition) => {
    if (!groups.has(group.attributeId)) groups.set(group.attributeId, group);
    for (const filter of group.filters) {
      if (!filters.has(filter.filterId))
        filters.set(filter.filterId, { group, filter, groupPosition });
    }
  });
  const manufacturers = new Map<ManufacturerId, Manufacturer>();
  const bySearchFilter = new Map<FilterId, Manufacturer>();
  for (const m of catalog.manufacturers) {
    if (!manufacturers.has(m.manufacturerId)) manufacturers.set(m.manufacturerId, m);
    if (m.searchFilterId !== undefined && !bySearchFilter.has(m.searchFilterId)) {
      bySearchFilter.set(m.searchFilterId, m);
    }
  }

  const index: CatalogIndex = {
    catalog,
    filter: (id) => filters.get(id),
    group: (attributeId) => groups.get(attributeId),
    manufacturer: (id) => manufacturers.get(id),
    manufacturerBySearchFilterId: (id) => bySearchFilter.get(id),
  };
  indexCache.set(catalog, index);
  return index;
}
