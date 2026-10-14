import { type FilterCatalog, indexCatalog } from "../catalog";
import type { FilterId, ManufacturerId } from "../ids";
import { type IdealoQuery, normalizeQuery, type PriceRange, type SortKey } from "./model";

export interface QueryDescription {
  categoryId: string;
  groups: { attributeId: string; name: string; filters: { filterId: FilterId; label: string }[] }[];
  manufacturers: { manufacturerId: ManufacturerId | undefined; name: string }[];
  unknownFilterIds: FilterId[];
  unknownManufacturerIds: ManufacturerId[];
  price: PriceRange | undefined;
  sort: SortKey | undefined;
  text: string | undefined;
  offset: number | undefined;
  summary: string;
}

const formatPrice = (price: PriceRange): string =>
  price.min !== undefined && price.max !== undefined
    ? `${price.min}-${price.max} EUR`
    : price.min !== undefined
      ? `from ${price.min} EUR`
      : `up to ${price.max} EUR`;

/**
 * Ids absent from the catalog (or all ids, if the catalog belongs to another category) are
 * reported as unknown. A filter id that is a manufacturer's searchFilterId is listed under manufacturers.
 */
export function describeQuery(query: IdealoQuery, catalog: FilterCatalog): QueryDescription {
  const q = normalizeQuery(query);
  const index = catalog.categoryId === q.categoryId ? indexCatalog(catalog) : undefined;

  const byGroup = new Map<
    string,
    {
      position: number;
      attributeId: string;
      name: string;
      filters: { filterId: FilterId; label: string }[];
    }
  >();
  const manufacturers: QueryDescription["manufacturers"] = [];
  const unknownFilterIds: FilterId[] = [];
  const unknownManufacturerIds: ManufacturerId[] = [];

  for (const id of q.filterIds) {
    const hit = index?.filter(id);
    if (hit) {
      const bucket = byGroup.get(hit.group.attributeId) ?? {
        position: hit.groupPosition,
        attributeId: hit.group.attributeId,
        name: hit.group.name,
        filters: [],
      };
      bucket.filters.push({ filterId: id, label: hit.filter.label });
      byGroup.set(hit.group.attributeId, bucket);
      continue;
    }
    const manufacturer = index?.manufacturerBySearchFilterId(id);
    if (manufacturer)
      manufacturers.push({ manufacturerId: manufacturer.manufacturerId, name: manufacturer.name });
    else unknownFilterIds.push(id);
  }
  for (const id of q.manufacturerIds) {
    const manufacturer = index?.manufacturer(id);
    if (manufacturer) manufacturers.push({ manufacturerId: id, name: manufacturer.name });
    else unknownManufacturerIds.push(id);
  }

  const groups = [...byGroup.values()]
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...group }) => group);

  const lines = [`Category ${q.categoryId}`];
  for (const group of groups) {
    lines.push(`${group.name}: ${group.filters.map((f) => f.label).join(", ")}`);
  }
  if (manufacturers.length)
    lines.push(`Manufacturer: ${manufacturers.map((m) => m.name).join(", ")}`);
  if (unknownFilterIds.length) lines.push(`Unknown filter ids: ${unknownFilterIds.join(", ")}`);
  if (unknownManufacturerIds.length) {
    lines.push(`Unknown manufacturer ids: ${unknownManufacturerIds.join(", ")}`);
  }
  if (q.price) lines.push(`Price: ${formatPrice(q.price)}`);
  if (q.sort) lines.push(`Sort: ${q.sort}`);
  if (q.text) lines.push(`Search text: ${q.text}`);
  if (q.offset) lines.push(`Result offset: ${q.offset}`);

  return {
    categoryId: q.categoryId,
    groups,
    manufacturers,
    unknownFilterIds,
    unknownManufacturerIds,
    price: q.price,
    sort: q.sort,
    text: q.text,
    offset: q.offset,
    summary: lines.join("\n"),
  };
}
