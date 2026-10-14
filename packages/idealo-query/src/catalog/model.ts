import { z } from "zod";
import { CategoryIdSchema, FilterIdSchema, ManufacturerIdSchema } from "../ids";

const CountSchema = z.number().int().min(0);

const FilterOptionSchema = z.object({
  filterId: FilterIdSchema,
  label: z.string(),
  count: CountSchema.optional(),
});
export type FilterOption = z.infer<typeof FilterOptionSchema>;

const FilterGroupSchema = z.object({
  attributeId: z.string().min(1),
  name: z.string(),
  filters: z.array(FilterOptionSchema),
});
export type FilterGroup = z.infer<typeof FilterGroupSchema>;

const ManufacturerSchema = z.object({
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
