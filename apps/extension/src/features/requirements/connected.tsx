import type { FilterCatalog, PriceRange, Requirements } from "@idealo-hw/idealo-query";
import { createRequirementEdits, useRequirementsView } from "./controller";
import { RequirementsSectionView } from "./view/RequirementsSection";
import type { RequirementsViewInput } from "./view-model";

export interface RequirementsSectionProps extends RequirementsViewInput {
  catalog: FilterCatalog;
  onChange: (next: Requirements) => void;
  onPriceChange: (price: PriceRange) => void;
  /** Opens the settings, where the PassMark exports are imported. */
  onOpenSettings: () => void;
}

/**
 * Requirement controls for the facets this category has. Everything reads and writes one
 * Requirements value; the plan only feeds the status lines.
 */
export function RequirementsSection({
  catalog,
  onChange,
  onPriceChange,
  onOpenSettings,
  ...input
}: RequirementsSectionProps) {
  const model = useRequirementsView(catalog, input);
  if (model === null) return null;
  return (
    <RequirementsSectionView
      model={model}
      onOpenSettings={onOpenSettings}
      edits={createRequirementEdits(input.requirements, onChange, onPriceChange)}
    />
  );
}
