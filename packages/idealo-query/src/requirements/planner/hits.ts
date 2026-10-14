import type { FacetOption } from "../../catalog";

export const hitsOf = (options: readonly FacetOption[]): number | null =>
  options.every((o) => o.count !== undefined)
    ? options.reduce((sum, o) => sum + (o.count ?? 0), 0)
    : null;
