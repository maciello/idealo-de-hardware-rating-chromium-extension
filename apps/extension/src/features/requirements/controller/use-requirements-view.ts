import { type FilterCatalog, facetsOf } from "@idealo-hw/idealo-query";
import { useMemo } from "react";
import {
  buildRequirementsViewModel,
  type RequirementsViewInput,
  type RequirementsViewModel,
} from "../view-model";

/** The requirement controls' view-model; the catalog's facet groups are read once per catalog. */
export function useRequirementsView(
  catalog: FilterCatalog,
  input: RequirementsViewInput,
): RequirementsViewModel | null {
  const groups = useMemo(() => facetsOf(catalog), [catalog]);
  return buildRequirementsViewModel(groups, input);
}
