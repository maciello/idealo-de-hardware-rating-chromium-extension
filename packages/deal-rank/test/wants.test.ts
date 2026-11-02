import { describe, expect, it } from "vitest";
import { CandidateSchema, WantsSchema } from "../src";

describe("WantsSchema", () => {
  it("applies defaults", () => {
    const w = WantsSchema.parse({ budget_eur: { max: 1000 } });
    expect(w).toMatchObject({ top_n: 5, weights: {}, lenses: [], custom_metrics: [] });
    expect(w.hard.custom).toEqual([]);
  });
  it("accepts weights for built-in and declared custom metrics", () => {
    const w = WantsSchema.parse({
      budget_eur: { max: 1000 },
      custom_metrics: [{ key: "sensor_mp", direction: "higher", label: "Sensor (MP)" }],
      weights: { price: 3, sensor_mp: 2, refresh_hz: 1 },
    });
    expect(w.weights.sensor_mp).toBe(2);
  });
  it("rejects a weight key that is neither", () => {
    const result = WantsSchema.safeParse({ budget_eur: { max: 1000 }, weights: { zoom: 2 } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/"zoom".*neither a built-in metric/);
  });
  it("rejects a custom metric that shadows a built-in one", () => {
    const result = WantsSchema.safeParse({
      budget_eur: { max: 1 },
      custom_metrics: [{ key: "ram_gb", direction: "higher", label: "RAM" }],
    });
    expect(result.success).toBe(false);
  });
  it("lowercases free-text product types", () => {
    const w = WantsSchema.parse({
      budget_eur: { max: 1 },
      hard: { product_types_allowed: ["Camera"] },
    });
    expect(w.hard.product_types_allowed).toEqual(["camera"]);
  });
});

describe("CandidateSchema", () => {
  it("fills optional fields and normalises features", () => {
    const c = CandidateSchema.parse({
      sku: "X",
      name: "X",
      url: "u",
      found_by: ["a"],
      fetched_at: "2026-11-01",
      offers: [
        {
          shop: "s",
          price_eur: 1,
          shipping_eur: 0,
          rating_avg: null,
          rating_count: null,
          marketplace: false,
          payments: [],
        },
      ],
      features: ["Numpad"],
    });
    expect(c).toMatchObject({
      cpu: null,
      extra: {},
      features: ["numpad"],
      product_type: "unknown",
    });
    expect(c.display.panel).toEqual([]);
  });
});
