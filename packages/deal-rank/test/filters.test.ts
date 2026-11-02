import { describe, expect, it } from "vitest";
import { rankDeals } from "../src";
import { candidate, lookupOf, offer, wants } from "./helpers";

const run = (entries: Parameters<typeof rankDeals>[0], w: Parameters<typeof rankDeals>[1]) =>
  rankDeals(entries, w, lookupOf({}));

describe("hard filters", () => {
  it("excludes over budget and below the budget minimum", () => {
    const report = run(
      [
        candidate({ sku: "OVER", offers: [offer({ price_eur: 1500 })] }),
        candidate({ sku: "UNDER", offers: [offer({ price_eur: 100 })] }),
        candidate({ sku: "OK", offers: [offer({ price_eur: 600 })] }),
      ],
      wants({ budget_eur: { min: 300, max: 1000 } }),
    );
    expect(report.ranked.map((r) => r.sku)).toEqual(["OK"]);
    const reasons = Object.fromEntries(report.excluded.map((e) => [e.sku, e.reasons]));
    expect(reasons.OVER).toEqual([{ check: "above_budget_max", value: 1500, threshold: 1000 }]);
    expect(reasons.UNDER?.[0]?.check).toBe("below_budget_min");
  });
  it("excludes a failing check with value and threshold", () => {
    const report = run(
      [candidate({ sku: "LOW", ram_gb: 8 }), candidate({ sku: "HIGH", ram_gb: 32 })],
      wants({ hard: { ram_gb_min: 16 } }),
    );
    expect(report.excluded).toMatchObject([
      { sku: "LOW", reasons: [{ check: "ram_gb_min", value: 8, threshold: 16 }] },
    ]);
  });
  it("never excludes on a missing value, it flags unverified_<check>", () => {
    const report = run([candidate({ ram_gb: null })], wants({ hard: { ram_gb_min: 16 } }));
    expect(report.ranked).toHaveLength(1);
    expect(report.ranked[0]?.red_flags.map((f) => f.id)).toContain("unverified_ram_gb_min");
  });
  it("checks weight as a maximum and refresh rate as a minimum", () => {
    const report = run(
      [
        candidate({ sku: "HEAVY", weight_kg: 2.5, display: { refresh_hz: 60 } }),
        candidate({ sku: "FAST", weight_kg: 1.4, display: { refresh_hz: 144 } }),
      ],
      wants({ hard: { weight_kg_max: 2, refresh_hz_min: 120 } }),
    );
    expect(report.excluded[0]?.reasons.map((r) => r.check)).toEqual([
      "refresh_hz_min",
      "weight_kg_max",
    ]);
    expect(report.ranked.map((r) => r.sku)).toEqual(["FAST"]);
  });
  it("counts product type and dedicated GPU as checks", () => {
    const report = run(
      [
        candidate({ sku: "G", product_type: "gaming", vram_gb: 8 }),
        candidate({ sku: "B", product_type: "business", vram_gb: 0 }),
      ],
      wants({ hard: { product_types_allowed: ["gaming"], require_dedicated_gpu: true } }),
    );
    expect(report.excluded[0]?.reasons.map((r) => r.check)).toEqual([
      "require_dedicated_gpu",
      "product_types_allowed",
    ]);
  });
  it("applies custom limits and flags unverified_custom_<key>", () => {
    const report = run(
      [
        candidate({ sku: "A", extra: { sensor_mp: 12 } }),
        candidate({ sku: "B", extra: { sensor_mp: 24 } }),
        candidate({ sku: "C" }),
      ],
      wants({ hard: { custom: [{ key: "sensor_mp", min: 20 }] } }),
    );
    expect(report.excluded[0]).toMatchObject({
      sku: "A",
      reasons: [{ check: "custom_sensor_mp_min", value: 12, threshold: 20 }],
    });
    const c = report.ranked.find((r) => r.sku === "C");
    expect(c?.red_flags.map((f) => f.id)).toContain("unverified_custom_sensor_mp");
  });
  it("excludes a candidate that lacks a must-have feature", () => {
    const report = run(
      [candidate({ sku: "A", features: ["numpad"] }), candidate({ sku: "B" })],
      wants({ must_have_features: ["numpad"] }),
    );
    expect(report.excluded).toMatchObject([
      { sku: "B", reasons: [{ check: "feature", value: "numpad", threshold: "required" }] },
    ]);
  });
});
