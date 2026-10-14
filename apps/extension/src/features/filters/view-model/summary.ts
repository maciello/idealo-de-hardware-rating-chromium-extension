import type { PriceRange, QueryDescription } from "@idealo-hw/idealo-query";
import { FILTERS_COPY } from "../copy";

const S = FILTERS_COPY.summary;

const priceText = ({ min, max }: PriceRange): string => {
  if (min !== undefined && max !== undefined) return S.priceBetween(min, max);
  return min !== undefined ? S.priceFrom(min) : S.priceUpTo(max);
};

/** A query in words, one line per part that is set: the category, filters by group, price, sort, text, offset. */
export function summaryOf(description: QueryDescription): string {
  const { groups, manufacturers, unknownFilterIds, unknownManufacturerIds } = description;
  const names = (values: readonly string[]): string => values.join(S.listSeparator);
  const lines = [
    S.category(description.categoryId),
    ...groups.map((group) => S.group(group.name, names(group.filters.map((f) => f.label)))),
    ...(manufacturers.length > 0 ? [S.manufacturer(names(manufacturers.map((m) => m.name)))] : []),
    ...(unknownFilterIds.length > 0 ? [S.unknownFilters(names(unknownFilterIds))] : []),
    ...(unknownManufacturerIds.length > 0
      ? [S.unknownManufacturers(names(unknownManufacturerIds))]
      : []),
    ...(description.price ? [S.price(priceText(description.price))] : []),
    ...(description.sort ? [S.sort(description.sort)] : []),
    ...(description.text ? [S.text(description.text)] : []),
    ...(description.offset ? [S.offset(description.offset)] : []),
  ];
  return lines.join(S.lineSeparator);
}
