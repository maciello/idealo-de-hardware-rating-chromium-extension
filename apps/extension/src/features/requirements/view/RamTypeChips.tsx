import { Box, Chip, Group, Text } from "@mantine/core";
import { REQUIREMENTS_COPY } from "../copy";
import type { RamTypeModel } from "../view-model";

export interface RamTypeChipsProps {
  model: RamTypeModel;
  onChange: (labels: string[]) => void;
}

export function RamTypeChips({ model, onChange }: RamTypeChipsProps) {
  return (
    <Box data-testid="req-ram_type">
      <Text size="xs" fw={500} mb={4}>
        {REQUIREMENTS_COPY.ramType.label}
      </Text>
      <Chip.Group multiple value={model.selected} onChange={onChange}>
        <Group gap={6}>
          {model.labels.map((label) => (
            <Chip key={label} value={label} size="xs" disabled={!model.available}>
              {label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Text size="xs" c="dimmed" data-testid="req-status-ram_type">
        {model.note}
      </Text>
    </Box>
  );
}
