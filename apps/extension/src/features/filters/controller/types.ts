import type { FilterCatalog, IdealoQuery } from "@idealo-hw/idealo-query";
import type { RequirementsContext, RequirementsStore } from "../model";

export interface FilterBuilderInput {
  opened: boolean;
  onOpenedChange: (opened: boolean) => void;
  initialQuery: () => IdealoQuery;
  /** Url that applies a query on this page type; "" when it cannot be expressed. */
  toUrl: (query: IdealoQuery) => string;
  /** False on a search page that names no category: only text, price and sort can be applied. */
  canFilter: boolean;
  loadCatalog: (query: IdealoQuery) => Promise<FilterCatalog | null>;
  /** What the requirement controls need besides the catalog; read each time the panel opens. */
  loadContext: (query: IdealoQuery) => Promise<RequirementsContext>;
  /** Where the last requirements of each category are kept. */
  requirementsStore: RequirementsStore;
  onApply: (url: string) => void;
  onOpenSettings: () => void;
}
