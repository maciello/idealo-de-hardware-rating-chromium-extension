import type { Evaluated } from "./evaluate";
import type { Wants } from "./wants";

export type CheckValue = number | string | boolean;

export interface ExclusionReason {
  check: string;
  value: CheckValue;
  threshold: CheckValue;
}

export interface FilterOutcome {
  reasons: ExclusionReason[];
  /** Checks that could not run because the candidate lacks the value; each becomes an unverified_<check> flag. */
  unverified: string[];
}

interface Check {
  check: string;
  value: number | null;
  threshold: CheckValue;
  fails: (value: number) => boolean;
}

type Row = [
  check: string,
  threshold: number | undefined,
  value: number | null,
  kind: "min" | "max",
];

const atLeast = (threshold: number) => (value: number) => value < threshold;
const atMost = (threshold: number) => (value: number) => value > threshold;

const customRows = (item: Evaluated, hard: Wants["hard"]): Row[] =>
  hard.custom.flatMap(({ key, min, max }): Row[] => {
    const value = item.candidate.extra[key] ?? null;
    return [
      ...(min === undefined ? [] : [[`custom_${key}_min`, min, value, "min"] satisfies Row]),
      ...(max === undefined ? [] : [[`custom_${key}_max`, max, value, "max"] satisfies Row]),
    ];
  });

/** The numeric hard checks the wants file asks for, each with the candidate's value. */
function numericChecks(item: Evaluated, hard: Wants["hard"]): Check[] {
  const { candidate } = item;
  const rows: Row[] = [
    ["ram_gb_min", hard.ram_gb_min, candidate.ram_gb, "min"],
    ["webcam_mp_min", hard.webcam_mp_min, item.webcamMp, "min"],
    ["display_nits_min", hard.display_nits_min, candidate.display.nits, "min"],
    ["refresh_hz_min", hard.refresh_hz_min, candidate.display.refresh_hz, "min"],
    ["ssd_gb_min", hard.ssd_gb_min, candidate.ssd_gb, "min"],
    ["weight_kg_max", hard.weight_kg_max, candidate.weight_kg, "max"],
    ["battery_wh_min", hard.battery_wh_min, candidate.battery_wh, "min"],
    ["vram_gb_min", hard.vram_gb_min, item.metrics.vram_gb ?? null, "min"],
    ["ai_memory_gb_min", hard.ai_memory_gb_min, item.aiMemory.gb, "min"],
  ];
  return [...rows, ...customRows(item, hard)].flatMap(([check, threshold, value, kind]) =>
    threshold === undefined
      ? []
      : [
          {
            check,
            value,
            threshold,
            fails: kind === "min" ? atLeast(threshold) : atMost(threshold),
          },
        ],
  );
}

function budgetChecks(item: Evaluated, budget: Wants["budget_eur"]): Check[] {
  const total = item.best.total_eur;
  return [
    { check: "above_budget_max", value: total, threshold: budget.max, fails: atMost(budget.max) },
    ...(budget.min === undefined
      ? []
      : [
          {
            check: "below_budget_min",
            value: total,
            threshold: budget.min,
            fails: atLeast(budget.min),
          },
        ]),
  ];
}

const CUSTOM_BOUND = /^(custom_.+)_(?:min|max)$/;

/** Yes/no checks: dedicated GPU, product type, required features. */
function categoricalChecks(item: Evaluated, wants: Wants): FilterOutcome {
  const reasons: ExclusionReason[] = [];
  const unverified: string[] = [];
  const { require_dedicated_gpu: needGpu, product_types_allowed: allowed } = wants.hard;
  if (needGpu === true) {
    if (item.dedicatedGpu === null) unverified.push("require_dedicated_gpu");
    else if (!item.dedicatedGpu) {
      reasons.push({ check: "require_dedicated_gpu", value: false, threshold: true });
    }
  }
  if (allowed !== undefined && !allowed.includes(item.candidate.product_type)) {
    reasons.push({
      check: "product_types_allowed",
      value: item.candidate.product_type,
      threshold: allowed.join("|"),
    });
  }
  for (const feature of wants.must_have_features) {
    if (!item.features.includes(feature)) {
      reasons.push({ check: "feature", value: feature, threshold: "required" });
    }
  }
  return { reasons, unverified };
}

/** Applies the budget and hard filters. A missing value never excludes; it is reported as unverified. */
export function applyHardFilters(item: Evaluated, wants: Wants): FilterOutcome {
  const reasons: ExclusionReason[] = [];
  const unverified: string[] = [];
  const checks = [...budgetChecks(item, wants.budget_eur), ...numericChecks(item, wants.hard)];
  for (const { check, value, threshold, fails } of checks) {
    if (value === null) unverified.push(check.replace(CUSTOM_BOUND, "$1"));
    else if (fails(value)) reasons.push({ check, value, threshold });
  }
  const rest = categoricalChecks(item, wants);
  return {
    reasons: [...reasons, ...rest.reasons],
    unverified: [...new Set([...unverified, ...rest.unverified])],
  };
}
