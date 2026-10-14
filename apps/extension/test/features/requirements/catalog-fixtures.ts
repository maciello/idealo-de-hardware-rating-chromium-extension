import {
  categoryId,
  type FilterCatalog,
  type FilterGroup,
  filterId,
} from "@idealo-hw/idealo-query";

export const group = (name: string, labels: string[]): FilterGroup => ({
  attributeId: name,
  name,
  filters: labels.map((label, i) => ({ filterId: filterId(String(1000 + i)), label })),
});
export const catalog = (...groups: FilterGroup[]): FilterCatalog => ({
  categoryId: categoryId("3751"),
  groups,
  manufacturers: [],
});
