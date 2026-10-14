import type { FacetPlan } from "@idealo-hw/idealo-query";
import { Box, Chip, Group, Text } from "@mantine/core";
import { statusLine } from "./status";

/** Shown disabled where the category has no RAM-type group, so the control is not a surprise elsewhere. */
const FALLBACK_TYPES = ["DDR5", "LPDDR5X", "LPDDR5", "DDR4", "LPDDR4X"] as const;

const generation = (label: string): number => Number(/\d+/.exec(label)?.[0] ?? 0);

/** Newest generation first, plain before low-power within one. */
const byGeneration = (a: string, b: string): number =>
  generation(b) - generation(a) || a.localeCompare(b);

export interface RamTypeChipsProps {
  /** Labels of the category's RAM-type group; empty when it has none. */
  listed: readonly string[];
  selected: readonly string[];
  plan: FacetPlan | undefined;
  onChange: (labels: string[]) => void;
}

export function RamTypeChips({ listed, selected, plan, onChange }: RamTypeChipsProps) {
  const available = listed.length > 0;
  const labels = [...(available ? listed : FALLBACK_TYPES)].sort(byGeneration);
  const status = available ? statusLine(plan) : null;
  return (
    <Box data-testid="req-ram_type">
      <Text size="xs" fw={500} mb={4}>
        RAM type
      </Text>
      <Chip.Group multiple value={available ? [...selected] : []} onChange={onChange}>
        <Group gap={6}>
          {labels.map((label) => (
            <Chip key={label} value={label} size="xs" disabled={!available}>
              {label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Text size="xs" c="dimmed" data-testid="req-status-ram_type">
        {available ? status : "idealo has no RAM-type filter here"}
      </Text>
    </Box>
  );
}
