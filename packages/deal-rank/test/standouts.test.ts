import { describe, expect, it } from "vitest";
import { rankDeals } from "../src";
import { candidate, lookupOf, offer, wants } from "./helpers";

const run = (entries: Parameters<typeof rankDeals>[0], w = wants()) =>
  rankDeals(entries, w, lookupOf({}));

describe("standouts", () => {
  it("names the best value with the runner-up, regardless of weights", () => {
    const report = run([
      candidate({ sku: "A", battery_wh: 90 }),
      candidate({ sku: "B", battery_wh: 70 }),
      candidate({ sku: "C", battery_wh: 60 }),
    ]);
    expect(report.ranked.find((r) => r.sku === "A")?.standouts).toContainEqual({
      metric: "battery_wh",
      value: 90,
      runner_up: 70,
    });
    expect(report.ranked.find((r) => r.sku === "B")?.standouts).toEqual([]);
  });
  it("uses the lowest value for lower-is-better metrics", () => {
    const report = run([
      candidate({ sku: "A", weight_kg: 1.1 }),
      candidate({ sku: "B", weight_kg: 1.6 }),
    ]);
    expect(report.ranked.find((r) => r.sku === "A")?.standouts.map((s) => s.metric)).toContain(
      "weight_kg",
    );
  });
  it("needs two values and a strict lead", () => {
    const report = run([
      candidate({ sku: "A", battery_wh: 70, offers: [offer({ price_eur: 500 })] }),
      candidate({ sku: "B", battery_wh: 70, offers: [offer({ price_eur: 500 })] }),
      candidate({ sku: "C", ssd_gb: 512, offers: [offer({ price_eur: 500 })] }),
    ]);
    const all = report.ranked.flatMap((r) => r.standouts.map((s) => s.metric));
    expect(all).not.toContain("ssd_gb");
    expect(all).not.toContain("price");
  });
  it("skips a best value that several candidates share", () => {
    const report = run([
      candidate({ sku: "A", battery_wh: 90 }),
      candidate({ sku: "B", battery_wh: 90 }),
      candidate({ sku: "C", battery_wh: 60 }),
    ]);
    const all = report.ranked.flatMap((r) => r.standouts.map((s) => s.metric));
    expect(all).not.toContain("battery_wh");
  });
  it("skips a lead of less than 5 % over the runner-up", () => {
    const report = run([
      candidate({ sku: "A", battery_wh: 72 }),
      candidate({ sku: "B", battery_wh: 70 }),
      candidate({ sku: "C", weight_kg: 1.5 }),
      candidate({ sku: "D", weight_kg: 1.42 }),
    ]);
    const all = report.ranked.flatMap((r) => r.standouts.map((s) => s.metric));
    expect(all).not.toContain("battery_wh");
    expect(all).toContain("weight_kg");
  });
  it("covers custom metrics", () => {
    const report = run(
      [
        candidate({ sku: "A", extra: { zoom_x: 30 } }),
        candidate({ sku: "B", extra: { zoom_x: 10 } }),
      ],
      wants({ custom_metrics: [{ key: "zoom_x", direction: "higher", label: "Zoom" }] }),
    );
    expect(report.ranked.find((r) => r.sku === "A")?.standouts).toContainEqual({
      metric: "zoom_x",
      value: 30,
      runner_up: 10,
    });
  });
});

describe("rare features", () => {
  const pool = (n: number, featured: number) =>
    Array.from({ length: n }, (_, i) =>
      candidate({
        sku: `S${i}`,
        features: i < featured ? ["numpad"] : [],
        display: { panel: i === 0 ? ["OLED", "Touchscreen"] : ["IPS"] },
        webcam: { ir: i === 0 ? true : null },
        wifi_standard: i === 0 ? "Wi-Fi 7 (802.11be)" : "Wi-Fi 6 (802.11ax)",
      }),
    );
  it("marks derived and agent features that at most a third of candidates have", () => {
    const report = run(pool(6, 2));
    const first = report.ranked.find((r) => r.sku === "S0");
    expect(first?.rare_features).toEqual(
      expect.arrayContaining(["wifi_7", "oled", "touchscreen", "ir_camera", "numpad"]),
    );
    expect(report.ranked.find((r) => r.sku === "S1")?.rare_features).toEqual(["numpad"]);
  });
  it("does not mark a feature most candidates share", () => {
    const report = run(pool(6, 4));
    expect(report.ranked.find((r) => r.sku === "S0")?.rare_features).not.toContain("numpad");
  });
});
