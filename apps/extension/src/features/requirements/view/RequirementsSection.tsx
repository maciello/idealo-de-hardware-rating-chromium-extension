import { Stack, Text } from "@mantine/core";
import { REQUIREMENTS_COPY } from "../copy";
import type { RequirementEdits, RequirementsViewModel } from "../view-model";
import { CpuBlock } from "./CpuBlock";
import { GpuBlock } from "./GpuBlock";
import { NumericSlider } from "./NumericSlider";
import { PriceSlider } from "./PriceSlider";
import { RamTypeChips } from "./RamTypeChips";

export interface RequirementsSectionViewProps {
  model: RequirementsViewModel;
  edits: RequirementEdits;
  onOpenSettings: () => void;
}

/**
 * Requirement controls for the facets this category has: benchmark minimums for CPU and GPU,
 * numeric sliders, RAM-type chips, price. The model decides what is shown; edits report changes.
 */
export function RequirementsSectionView({
  model,
  edits,
  onOpenSettings,
}: RequirementsSectionViewProps) {
  return (
    <Stack gap="sm" data-testid="requirements">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {REQUIREMENTS_COPY.heading}
      </Text>

      {model.cpu && (
        <CpuBlock
          model={model.cpu}
          onMinimum={edits.setCpuMinimum}
          onCombine={edits.setCpuCombine}
          onOpenSettings={onOpenSettings}
        />
      )}
      {model.gpu && (
        <GpuBlock
          model={model.gpu}
          onMinimum={edits.setGpuMinimum}
          onOpenSettings={onOpenSettings}
        />
      )}

      {model.numeric.map(
        ({ facet, slider }) =>
          slider && (
            <NumericSlider
              key={facet}
              model={slider}
              onChange={(bound) => edits.setNumeric(facet, bound)}
            />
          ),
      )}

      <RamTypeChips model={model.ramType} onChange={edits.setRamTypes} />

      {model.price && <PriceSlider model={model.price} onChange={edits.setPrice} />}
    </Stack>
  );
}
