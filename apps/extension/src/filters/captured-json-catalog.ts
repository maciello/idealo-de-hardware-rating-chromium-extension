import type { FilterCatalogSource } from "./catalog-source";

/**
 * Port slot for a catalog read from capture-mode exports (ADR 0008). Intentionally returns null: the
 * filter-definition endpoint and its JSON shape are unknown until a real capture exists, and a
 * guessed parser would produce wrong ids. Implement `load` against `captureRing.list()` then.
 */
export const capturedJsonCatalog: FilterCatalogSource = {
  id: "captured_json",
  load: async () => null,
};
