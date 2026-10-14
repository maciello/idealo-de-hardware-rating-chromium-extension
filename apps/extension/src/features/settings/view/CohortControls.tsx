import type { CohortPolicy } from "@idealo-hw/hw-bench";
import { Group, NumberInput, SegmentedControl, Stack, Text } from "@mantine/core";
import { COHORT_INPUTS } from "../config";
import { SETTINGS_COPY } from "../copy";
import type { CutoffKind } from "../model";

interface CohortControlsProps {
  policy: CohortPolicy;
  onCutoffKind(kind: CutoffKind): void;
  /** Receives every edit; the controller decides whether it is valid enough to keep. */
  onChange(next: CohortPolicy): void;
}

/** Percentile cohort: which CPUs the "within segment" percentile compares against. */
export function CohortControls({ policy, onCutoffKind, onChange }: CohortControlsProps) {
  const { yearCutoff } = policy;
  return (
    <Stack gap="xs" data-testid="cohort">
      <Text size="sm" fw={500}>
        {SETTINGS_COPY.cohortTitle}
      </Text>
      <Text size="xs" c="dimmed">
        {SETTINGS_COPY.cohortDescription}
      </Text>
      <SegmentedControl
        size="xs"
        data={[...SETTINGS_COPY.cutoffChoices]}
        value={yearCutoff.kind}
        onChange={(kind) => onCutoffKind(kind as CutoffKind)}
        data-testid="cohort-cutoff"
      />
      <Group align="flex-end" grow>
        {yearCutoff.kind === "since_year" && (
          <NumberInput
            label={SETTINGS_COPY.firstYear}
            min={COHORT_INPUTS.year.min}
            max={COHORT_INPUTS.year.max}
            allowDecimal={false}
            value={yearCutoff.year}
            onChange={(year) =>
              typeof year === "number" &&
              onChange({ ...policy, yearCutoff: { kind: "since_year", year } })
            }
            data-testid="cohort-year"
          />
        )}
        {yearCutoff.kind === "rolling" && (
          <NumberInput
            label={SETTINGS_COPY.yearsBack}
            min={COHORT_INPUTS.years.min}
            max={COHORT_INPUTS.years.max}
            allowDecimal={false}
            value={yearCutoff.years}
            onChange={(years) =>
              typeof years === "number" &&
              onChange({ ...policy, yearCutoff: { kind: "rolling", years } })
            }
            data-testid="cohort-years"
          />
        )}
        <NumberInput
          label={SETTINGS_COPY.minScore}
          min={COHORT_INPUTS.minScore.min}
          allowDecimal={false}
          thousandSeparator={COHORT_INPUTS.minScore.thousandSeparator}
          decimalSeparator={COHORT_INPUTS.minScore.decimalSeparator}
          placeholder={SETTINGS_COPY.minScorePlaceholder}
          value={policy.minScore ?? ""}
          onChange={(minScore) =>
            onChange({ ...policy, minScore: typeof minScore === "number" ? minScore : null })
          }
          data-testid="cohort-min-score"
        />
      </Group>
    </Stack>
  );
}
