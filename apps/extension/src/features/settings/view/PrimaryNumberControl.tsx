import { SegmentedControl } from "@mantine/core";
import { LabeledRow } from "../../../ui";
import { SETTINGS_COPY } from "../copy";

interface PrimaryNumberControlProps {
  choices: readonly { value: string; label: string }[];
  value: string;
  onChange(value: string): void;
}

export function PrimaryNumberControl({ choices, value, onChange }: PrimaryNumberControlProps) {
  return (
    <LabeledRow label={SETTINGS_COPY.primaryLabel} stacked>
      <SegmentedControl
        fullWidth
        size="xs"
        data={[...choices]}
        value={value}
        onChange={onChange}
        data-testid="popup-primary"
      />
    </LabeledRow>
  );
}
