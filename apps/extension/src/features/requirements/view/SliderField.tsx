import { Box, Group, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface SliderFieldProps {
  /** Test id root: the field is `req-<id>`, its value text `req-value-<id>`, its status `req-status-<id>`. */
  id: string;
  label: string;
  /** Current setting as text ("any", "≥ 16 GB"). */
  value: string;
  /** What the plan did with it, one short line. */
  status?: string | null | undefined;
  /** Room under the track for mark labels. */
  withMarkLabels?: boolean;
  children: ReactNode;
}

/** Label row, the slider, and the status line, in the compact shape every requirement shares. */
export function SliderField({
  id,
  label,
  value,
  status,
  withMarkLabels = false,
  children,
}: SliderFieldProps) {
  return (
    <Box data-testid={`req-${id}`}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="xs" fw={500}>
          {label}
        </Text>
        <Text size="xs" c="dimmed" data-testid={`req-value-${id}`}>
          {value}
        </Text>
      </Group>
      <Box px={10} pt={4} pb={withMarkLabels ? 20 : 4}>
        {children}
      </Box>
      {status && (
        <Text size="xs" c="dimmed" data-testid={`req-status-${id}`}>
          {status}
        </Text>
      )}
    </Box>
  );
}
