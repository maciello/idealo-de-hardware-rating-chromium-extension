import { describe, expect, it } from "vitest";
import { rankDeals } from "../src";
import { candidate, lookupOf, offer, wants } from "./helpers";

const lookup = lookupOf({ "CPU Fast": { mark: 20000 }, "CPU Slow": { mark: 10000 } });

describe("scoring", () => {
  const entries = [
    candidate({ sku: "A", cpu: "CPU Fast", ram_gb: 16, offers: [offer({ price_eur: 1000 })] }),
    candidate({ sku: "B", cpu: "CPU Slow", ram_gb: 32, offers: [offer({ price_eur: 800 })] }),
    candidate({ sku: "C", cpu: "CPU Slow", offers: [offer({ price_eur: 900 })] }),
  ];

  it("min-max normalises, inverts lower-is-better and scores on 0..100", () => {
    const report = rankDeals(entries, wants({ weights: { cpu_mark: 1, price: 1 } }), lookup);
    const score = (sku: string) => report.ranked.find((r) => r.sku === sku)?.score;
    expect(score("A")).toBe(50);
    expect(score("B")).toBe(50);
    expect(score("C")).toBe(25);
    expect(report.weighted_metrics).toEqual(["cpu_mark", "price"]);
  });
  it("breaks ties on lower price", () => {
    const report = rankDeals(entries, wants({ weights: { cpu_mark: 1, price: 1 } }), lookup);
    expect(report.ranked.map((r) => r.sku)).toEqual(["B", "A", "C"]);
  });
  it("scores a missing value 0 and notes it", () => {
    const report = rankDeals(entries, wants({ weights: { ram_gb: 1 } }), lookup);
    const c = report.ranked.find((r) => r.sku === "C");
    expect(c?.score).toBe(0);
    expect(c?.system_notes).toContain("missing:ram_gb");
    expect(report.ranked[0]?.sku).toBe("B");
  });
  it("gives everyone 1 when all values are equal", () => {
    const report = rankDeals(entries.slice(1, 3), wants({ weights: { cpu_mark: 2 } }), lookup);
    expect(report.ranked.map((r) => r.score)).toEqual([100, 100]);
  });
  it("keeps per-metric contributions", () => {
    const report = rankDeals(entries, wants({ weights: { cpu_mark: 3, price: 1 } }), lookup);
    expect(report.ranked.find((r) => r.sku === "A")?.contributions).toEqual([
      { metric: "cpu_mark", weight: 3, value: 20000, normalised: 1, points: 75 },
      { metric: "price", weight: 1, value: 1000, normalised: 0, points: 0 },
    ]);
  });
  it("scores custom metrics by their declared direction and weighted features as 0/1", () => {
    const pool = [
      candidate({ sku: "A", extra: { noise_db: 40 }, features: ["quiet_fan"] }),
      candidate({ sku: "B", extra: { noise_db: 30 } }),
    ];
    const report = rankDeals(
      pool,
      wants({
        custom_metrics: [{ key: "noise_db", direction: "lower", label: "Noise (dB)" }],
        weights: { noise_db: 1 },
        feature_weights: { quiet_fan: 1 },
      }),
      lookup,
    );
    expect(report.ranked.map((r) => [r.sku, r.score])).toEqual([
      ["A", 50],
      ["B", 50],
    ]);
    expect(report.weighted_metrics).toEqual(["noise_db", "feature:quiet_fan"]);
  });
});
