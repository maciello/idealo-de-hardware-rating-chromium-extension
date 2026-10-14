import { Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { MutedText } from "./MutedText";

const LABEL_WIDTH = 104;

/** Label left for short content; `stacked` puts the label above, for content that needs the width. */
export function LabeledRow({
  label,
  stacked = false,
  labelWidth = LABEL_WIDTH,
  children,
}: {
  label: string;
  stacked?: boolean;
  labelWidth?: number;
  children: ReactNode;
}) {
  if (stacked) {
    return (
      <Stack gap={6}>
        <MutedText fz="xs">{label}</MutedText>
        {children}
      </Stack>
    );
  }
  return (
    <Group wrap="nowrap" align="flex-start" gap="sm">
      <MutedText fz="xs" w={labelWidth} pt={2} style={{ flex: "none" }}>
        {label}
      </MutedText>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </Group>
  );
}
