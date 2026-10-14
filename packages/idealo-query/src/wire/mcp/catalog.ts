import { z } from "zod";
import type { FilterCatalog } from "../../catalog";
import { type CategoryId, FilterIdSchema, ManufacturerIdSchema } from "../../ids";
import { numericString } from "../numeric-string";

const CountSchema = z.number().int().min(0);

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
