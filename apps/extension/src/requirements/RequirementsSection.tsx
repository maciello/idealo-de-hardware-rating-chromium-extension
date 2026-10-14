import {
  type FacetGroup,
  type FilterCatalog,
  facetsOf,
  type ModelScorer,
  type PriceRange,
  type Requirements,
  type RequirementsPlan,
} from "@idealo-hw/idealo-query";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { NUMERIC_CONTROLS } from "./controls";
import { NumericSlider } from "./NumericSlider";
import { PriceSlider } from "./PriceSlider";
import { RamTypeChips } from "./RamTypeChips";
import { ScoreSlider } from "./ScoreSlider";
import { METRIC, type Metric, scoreSpan } from "./scorer";
import {
  type Bound,
  type Combine,
  setCombine,
  setLabels,
  setMinimum,
  setNumeric,
  setPriceRange,
} from "./state";
import { statusLine } from "./status";

export interface RequirementsSectionProps {
  catalog: FilterCatalog;
  requirements: Requirements;
  plan: RequirementsPlan | null;
  scorer: ModelScorer;
  /** Which PassMark exports are imported; without one there is nothing to rank models by. */
  hasData: { cpu: boolean; gpu: boolean };
  priceBounds: { min: number; max: number } | null;
  /** Price shown when the requirements set none, e.g. the one in the page's url. */
  pagePrice: PriceRange | undefined;
  onChange: (next: Requirements) => void;
  onPriceChange: (price: PriceRange) => void;
}

const heading = (text: string) => (
  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
    {text}
  </Text>
);

const MIN_STEPS: Readonly<Record<Metric, number>> = {
  [METRIC.cpuMark]: 500,
  [METRIC.cpuSingle]: 50,
  [METRIC.g3d]: 500,
};

/**
 * Requirement controls for the facets this category has: benchmark minimums for CPU and GPU,
 * numeric sliders, RAM-type chips, price. Everything reads and writes one Requirements value; the
 * plan only feeds the status lines.
 */
export function RequirementsSection({
  catalog,
  requirements,
  plan,
  scorer,
  hasData,
  priceBounds,
  pagePrice,
  onChange,
  onPriceChange,
}: RequirementsSectionProps) {
  const groups = useMemo(() => facetsOf(catalog), [catalog]);
  const group = (facet: string): FacetGroup | undefined => groups.find((g) => g.facet === facet);
  const planOf = (facet: string) => plan?.facets.find((f) => f.facet === facet);
  const cpuGroup = group("cpu_model");
  const gpuGroup = group("gpu_model");
  const ramTypes = group("ram_type");
  const cpu = requirements.models.cpu_model;
  const gpu = requirements.models.gpu_model;
  const cpuCombine: Combine = cpu?.combine ?? "all";

  const spanOf = (
    target: FacetGroup | undefined,
    facet: "cpu_model" | "gpu_model",
    metric: Metric,
  ) => (target === undefined ? null : scoreSpan(target.group, facet, metric, scorer));
  const cpuMarkSpan = spanOf(cpuGroup, "cpu_model", METRIC.cpuMark);
  const cpuSingleSpan = spanOf(cpuGroup, "cpu_model", METRIC.cpuSingle);
  const g3dSpan = spanOf(gpuGroup, "gpu_model", METRIC.g3d);

  const cpuStatus = statusLine(planOf("cpu_model"));

  const numericControls = NUMERIC_CONTROLS.flatMap((control) => {
    const options = groups.flatMap((g) =>
      g.kind === "numeric" && g.facet === control.facet ? g.options : [],
    );
    return options.length === 0 ? [] : [{ control, options }];
  });
  const hasAnything =
    cpuGroup !== undefined ||
    gpuGroup !== undefined ||
    ramTypes !== undefined ||
    numericControls.length > 0 ||
    priceBounds !== null;
  if (!hasAnything) return null;

  const setCpuMinimum = (metric: Metric, value: number | undefined) =>
    onChange(setMinimum(requirements, "cpu_model", metric, value, cpuCombine));

  return (
    <Stack gap="sm" data-testid="requirements">
      {heading("Requirements")}

      {cpuGroup !== undefined &&
        (hasData.cpu && cpuMarkSpan !== null ? (
          <Stack gap={4}>
            <ScoreSlider
              id="cpu_mark"
              label="Multi-thread (CPU Mark)"
              span={cpuMarkSpan}
              step={MIN_STEPS[METRIC.cpuMark]}
              value={cpu?.minimums[METRIC.cpuMark]}
              onChange={(value) => setCpuMinimum(METRIC.cpuMark, value)}
            />
            <SegmentedControl
              size="xs"
              w="fit-content"
              data={[
                { value: "all", label: "and" },
                { value: "any", label: "or" },
              ]}
              value={cpuCombine}
              disabled={cpu === undefined}
              onChange={(value) =>
                onChange(setCombine(requirements, "cpu_model", value as Combine))
              }
              data-testid="req-combine"
              aria-label="Combine CPU minimums"
            />
            {cpuSingleSpan !== null && (
              <ScoreSlider
                id="cpu_single"
                label="Single-thread"
                span={cpuSingleSpan}
                step={MIN_STEPS[METRIC.cpuSingle]}
                value={cpu?.minimums[METRIC.cpuSingle]}
                onChange={(value) => setCpuMinimum(METRIC.cpuSingle, value)}
              />
            )}
            {cpuStatus && (
              <Text size="xs" c="dimmed" data-testid="req-status-cpu_model">
                {cpuStatus}
              </Text>
            )}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed" data-testid="req-no-cpu-data">
            Import PassMark CPU data in the settings to filter by CPU score.
          </Text>
        ))}

      {gpuGroup !== undefined &&
        (hasData.gpu && g3dSpan !== null ? (
          <ScoreSlider
            id="g3d"
            label="3D (G3D Mark)"
            span={g3dSpan}
            step={MIN_STEPS[METRIC.g3d]}
            value={gpu?.minimums[METRIC.g3d]}
            status={statusLine(planOf("gpu_model"))}
            onChange={(value) =>
              onChange(setMinimum(requirements, "gpu_model", METRIC.g3d, value, "all"))
            }
          />
        ) : (
          <Text size="xs" c="dimmed" data-testid="req-no-gpu-data">
            Import PassMark GPU data in the settings to filter by 3D score.
          </Text>
        ))}

      {numericControls.map(({ control, options }) => (
        <NumericSlider
          key={control.facet}
          control={control}
          options={options}
          bound={requirements.numeric[control.facet]}
          plan={planOf(control.facet)}
          onChange={(bound: Bound) => onChange(setNumeric(requirements, control.facet, bound))}
        />
      ))}

      <RamTypeChips
        listed={ramTypes?.group.filters.map((option) => option.label) ?? []}
        selected={requirements.labels.ram_type ?? []}
        plan={planOf("ram_type")}
        onChange={(labels) => onChange(setLabels(requirements, "ram_type", labels))}
      />

      {priceBounds !== null && (
        <PriceSlider
          bounds={priceBounds}
          price={requirements.price ?? pagePrice}
          onChange={(price) => {
            onChange(setPriceRange(requirements, price));
            onPriceChange(price);
          }}
        />
      )}
    </Stack>
  );
}
