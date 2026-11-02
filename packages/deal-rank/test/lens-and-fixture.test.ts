import { describe, expect, it } from "vitest";
import { rankDeals } from "../src";
import { candidate, lookupOf, offer, wants } from "./helpers";

describe("lens view", () => {
  const pool = [1, 2, 3, 4, 5].map((n) =>
    candidate({
      sku: `L${n}`,
      found_by: n === 5 ? ["light"] : ["cheap"],
      offers: [offer({ price_eur: 100 * n })],
    }),
  );
  const report = rankDeals(
    [
      ...pool,
      candidate({ sku: "BIG", found_by: ["cheap", "typo"], offers: [offer({ price_eur: 5000 })] }),
    ],
    wants({
      budget_eur: { max: 1000 },
      weights: { price: 1 },
      lenses: [
        { id: "cheap", label: "cheapest" },
        { id: "light", label: "lightest" },
      ],
    }),
    lookupOf({}),
  );

  it("lists the top three eligible per lens and the total found", () => {
    const cheap = report.lens_view.find((l) => l.id === "cheap");
    expect(cheap).toMatchObject({ found: 5, eligible: 4 });
    expect(cheap?.top.map((t) => t.sku)).toEqual(["L1", "L2", "L3"]);
    expect(report.lens_view.find((l) => l.id === "light")?.top.map((t) => t.sku)).toEqual(["L5"]);
  });
  it("reports found_by ids that no lens defines", () => {
    expect(report.unknown_lens_ids).toEqual(["typo"]);
  });
});

describe("a non-laptop pool without benchmarks", () => {
  const camera = (sku: string, price: number, sensor: number, zoom: number, features: string[]) =>
    candidate({
      sku,
      name: `Cam ${sku}`,
      product_type: "camera",
      offers: [offer({ price_eur: price })],
      extra: { sensor_mp: sensor, optical_zoom_x: zoom },
      features,
    });
  const report = rankDeals(
    [
      camera("C1", 900, 24, 3, ["image_stabilisation", "weather_sealed"]),
      camera("C2", 700, 20, 10, ["image_stabilisation"]),
      camera("C3", 800, 26, 5, []),
      camera("C4", 600, 16, 4, ["weather_sealed"]),
    ],
    wants({
      custom_metrics: [
        { key: "sensor_mp", direction: "higher", label: "Sensor (MP)" },
        { key: "optical_zoom_x", direction: "higher", label: "Zoom (x)" },
      ],
      weights: { sensor_mp: 3, optical_zoom_x: 2, price: 1 },
      must_have_features: ["image_stabilisation"],
      feature_weights: { weather_sealed: 1 },
    }),
    lookupOf({}),
  );

  it("ranks and excludes on a must-have feature", () => {
    expect(report.excluded.map((e) => e.sku).sort()).toEqual(["C3", "C4"]);
    expect(report.ranked.map((r) => r.sku)).toEqual(["C1", "C2"]);
  });
  it("shows a custom-metric standout and no benchmark flags", () => {
    const c2 = report.ranked.find((r) => r.sku === "C2");
    expect(c2?.standouts).toContainEqual({ metric: "optical_zoom_x", value: 10, runner_up: 3 });
    expect(c2?.red_flags.map((f) => f.id)).not.toContain("no_cpu_benchmark");
    expect(c2?.cpu_benchmark).toBeNull();
  });
});
