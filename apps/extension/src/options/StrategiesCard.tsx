import { type CohortPolicy, CohortPolicySchema, DEFAULT_COHORT_POLICY } from "@idealo-hw/hw-bench";
import {
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { resolveEnabledStrategyIds, STRATEGY_CATALOG } from "../features/ratings";
import { cohortPolicyItem, settingsItem } from "../platform/storage";
import { useStorageItem } from "../platform/storage/use-storage-item";

type CutoffKind = CohortPolicy["yearCutoff"]["kind"];

const CUTOFF_CHOICES: readonly { value: CutoffKind; label: string }[] = [
  { value: "none", label: "All years" },
  { value: "since_year", label: "Since year" },
  { value: "rolling", label: "Last N years" },
];

const SINCE_YEAR_DEFAULT = 2020;
const ROLLING_DEFAULT = 5;

/** Percentile cohort: which CPUs the "within segment" percentile compares against. */
function CohortControls() {
  const [stored, save] = useStorageItem(cohortPolicyItem);
  const parsed = CohortPolicySchema.safeParse(stored);
  const policy = parsed.success ? parsed.data : DEFAULT_COHORT_POLICY;
  const { yearCutoff } = policy;

  const setCutoff = (kind: CutoffKind): void =>
    save({
      ...policy,
      yearCutoff:
        kind === "none"
          ? { kind }
          : kind === "since_year"
            ? { kind, year: SINCE_YEAR_DEFAULT }
            : { kind, years: ROLLING_DEFAULT },
    });

  /** Out-of-range or empty input is ignored until it is valid, so storage only ever holds valid policies. */
  const update = (next: CohortPolicy): void => {
    if (CohortPolicySchema.safeParse(next).success) save(next);
  };

  return (
    <Stack gap="xs" data-testid="cohort">
      <Text size="sm" fw={500}>
        Percentile cohort
      </Text>
      <Text size="xs" c="dimmed">
        "Percentile within segment" ranks a CPU against other CPUs first seen on PassMark in this
        period; older chips would otherwise inflate every new CPU's rank.
      </Text>
      <SegmentedControl
        size="xs"
        data={[...CUTOFF_CHOICES]}
        value={yearCutoff.kind}
        onChange={(kind) => setCutoff(kind as CutoffKind)}
        data-testid="cohort-cutoff"
      />
      <Group align="flex-end" grow>
        {yearCutoff.kind === "since_year" && (
          <NumberInput
            label="First year"
            min={1990}
            max={2100}
            allowDecimal={false}
            value={yearCutoff.year}
            onChange={(year) =>
              typeof year === "number" &&
              update({ ...policy, yearCutoff: { kind: "since_year", year } })
            }
            data-testid="cohort-year"
          />
        )}
        {yearCutoff.kind === "rolling" && (
          <NumberInput
            label="Years back from the newest CPU in the data"
            min={1}
            max={50}
            allowDecimal={false}
            value={yearCutoff.years}
            onChange={(years) =>
              typeof years === "number" &&
              update({ ...policy, yearCutoff: { kind: "rolling", years } })
            }
            data-testid="cohort-years"
          />
        )}
        <NumberInput
          label="Minimum CPU Mark (optional)"
          min={0}
          allowDecimal={false}
          thousandSeparator="."
          decimalSeparator=","
          placeholder="No minimum"
          value={policy.minScore ?? ""}
          onChange={(minScore) =>
            update({ ...policy, minScore: typeof minScore === "number" ? minScore : null })
          }
          data-testid="cohort-min-score"
        />
      </Group>
    </Stack>
  );
}

export function StrategiesCard() {
  const [settings, saveSettings] = useStorageItem(settingsItem);
  const enabled = new Set(resolveEnabledStrategyIds(settings?.enabledStrategyIds));

  const toggle = (id: string, on: boolean): void => {
    const next = new Set(enabled);
    if (on) next.add(id);
    else next.delete(id);
    saveSettings({
      ...settings,
      enabledStrategyIds: STRATEGY_CATALOG.map((s) => s.id).filter((known) => next.has(known)),
    });
  };

  return (
    <Card withBorder padding="md" data-testid="strategies">
      <Stack gap="sm">
        <Title order={4}>Rating strategies</Title>
        <Text size="sm" c="dimmed">
          Every enabled strategy renders in the badge, side by side, so you can compare them.
        </Text>
        {STRATEGY_CATALOG.map((strategy) => (
          <Switch
            key={strategy.id}
            label={strategy.label}
            description={strategy.id}
            checked={enabled.has(strategy.id)}
            onChange={(event) => toggle(strategy.id, event.currentTarget.checked)}
            data-testid={`strategy-${strategy.id}`}
          />
        ))}
        <CohortControls />
      </Stack>
    </Card>
  );
}
