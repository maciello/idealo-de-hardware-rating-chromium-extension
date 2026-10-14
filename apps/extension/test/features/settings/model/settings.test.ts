import { DEFAULT_COHORT_POLICY } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { STRATEGY_CATALOG } from "../../../../src/features/ratings";
import {
  isValidCohortPolicy,
  readCohortPolicy,
  readSettings,
  withCutoffKind,
  withPrimaryStrategy,
  withStrategyToggled,
} from "../../../../src/features/settings/model";

describe("withStrategyToggled", () => {
  const catalog = STRATEGY_CATALOG.map((s) => s.id);
  const [a, b, c] = catalog as [string, string, string];

  it("adds and removes while keeping catalog order", () => {
    const on = withStrategyToggled({ enabledStrategyIds: [c, a] }, catalog, b, true);
    expect(on.enabledStrategyIds).toEqual([a, b, c]);
    const off = withStrategyToggled(on, catalog, a, false);
    expect(off.enabledStrategyIds).toEqual([b, c]);
  });

  it("keeps the primary strategy of the saved settings", () => {
    const next = withStrategyToggled(
      { enabledStrategyIds: [a], primaryStrategyId: b },
      catalog,
      c,
      true,
    );
    expect(next.primaryStrategyId).toBe(b);
  });
});

describe("withPrimaryStrategy", () => {
  it("saves the resolved enabled strategies next to the new primary", () => {
    const next = withPrimaryStrategy(null, "x");
    expect(next.primaryStrategyId).toBe("x");
    expect(next.enabledStrategyIds.length).toBeGreaterThan(0);
  });

  it("keeps explicitly enabled strategies", () => {
    expect(withPrimaryStrategy({ enabledStrategyIds: [] }, "x").enabledStrategyIds).toEqual([]);
  });
});

describe("readSettings", () => {
  it("is null for unreadable input", () => {
    expect(readSettings(null)).toBeNull();
    expect(readSettings({ enabledStrategyIds: 3 })).toBeNull();
    expect(readSettings({ enabledStrategyIds: ["a"] })).toEqual({ enabledStrategyIds: ["a"] });
  });
});

describe("cohort policy", () => {
  it("falls back when the stored policy is unreadable", () => {
    expect(readCohortPolicy({ nonsense: true }, DEFAULT_COHORT_POLICY)).toBe(DEFAULT_COHORT_POLICY);
  });

  it("starts each cutoff kind from its default window", () => {
    expect(withCutoffKind(DEFAULT_COHORT_POLICY, "since_year").yearCutoff).toEqual({
      kind: "since_year",
      year: 2020,
    });
    expect(withCutoffKind(DEFAULT_COHORT_POLICY, "rolling").yearCutoff).toEqual({
      kind: "rolling",
      years: 5,
    });
    expect(withCutoffKind(DEFAULT_COHORT_POLICY, "none").yearCutoff).toEqual({ kind: "none" });
  });

  it("rejects out-of-range edits", () => {
    expect(
      isValidCohortPolicy({
        ...DEFAULT_COHORT_POLICY,
        yearCutoff: { kind: "since_year", year: 1800 },
      }),
    ).toBe(false);
    expect(isValidCohortPolicy(DEFAULT_COHORT_POLICY)).toBe(true);
  });
});
