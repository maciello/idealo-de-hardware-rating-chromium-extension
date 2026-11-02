import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { type RankResult, runRank } from "../src/run";
import { fixture, tempOut } from "./paths";

describe("rank on the synthetic laptop fixture", () => {
  let result: RankResult;
  beforeAll(() => {
    result = runRank({
      wants: fixture("laptops", "wants.yaml"),
      candidates: [
        fixture("laptops", "candidates-a.yaml"),
        fixture("laptops", "candidates-b.yaml"),
      ],
      passmarkDir: fixture("passmark"),
      out: tempOut(),
    });
  });

  it("ranks by weighted score", () => {
    expect(result.report.ranked.map((r) => r.sku)).toEqual(["TB-MAX-16", "TB-PRO-14", "TB-AIR-13"]);
    expect(result.report.ranked[0]?.cpu_benchmark).toMatchObject({ cpu_mark: 55000 });
  });

  it("pools a sku found in two files", () => {
    expect(result.report.summary).toMatchObject({ candidates: 5, eligible: 3, excluded: 2 });
    const pro = result.report.ranked.find((r) => r.sku === "TB-PRO-14");
    expect(pro?.found_by.sort()).toEqual(["business", "local-ai"]);
    expect(pro?.best_offer.total_eur).toBe(1299);
    expect(pro?.notes).toHaveLength(2);
  });

  it("explains an exclusion", () => {
    const light = result.report.excluded.find((e) => e.sku === "TB-LITE-15");
    expect(light?.reasons).toEqual([{ check: "ram_gb_min", value: 8, threshold: 16 }]);
    expect(result.report.excluded.find((e) => e.sku === "TB-GAME-16")?.reasons[0]?.check).toBe(
      "weight_kg_max",
    );
  });

  it("resolves generic GPU labels through the CPU", () => {
    const pro = result.report.ranked.find((r) => r.sku === "TB-PRO-14");
    expect(pro?.gpu_benchmark).toMatchObject({ matched: "Intel Arc", integrated: true });
  });

  it("reports a standout and a red flag", () => {
    const max = result.report.ranked[0];
    expect(max?.standouts).toContainEqual({ metric: "cpu_mark", value: 55000, runner_up: 22000 });
    expect(max?.rare_features).toContain("unified_fast_memory");
    expect(max?.metrics.ai_memory_gb).toBe(48);
    const air = result.report.ranked.find((r) => r.sku === "TB-AIR-13");
    expect(air?.red_flags.map((f) => f.id)).toEqual(
      expect.arrayContaining(["marketplace_offer", "low_res_webcam", "trusted_offer_premium"]),
    );
  });

  it("builds the lens view", () => {
    const [business, ai] = result.report.lens_view;
    expect(business).toMatchObject({ id: "business", found: 3, eligible: 2 });
    expect(business?.top.map((t) => t.sku)).toEqual(["TB-PRO-14", "TB-AIR-13"]);
    expect(ai?.top.map((t) => t.sku)).toEqual(["TB-MAX-16", "TB-PRO-14"]);
  });

  it("writes report.json and report.md in German number format", () => {
    const json = JSON.parse(readFileSync(result.jsonPath, "utf8"));
    expect(json.ranked[0].sku).toBe("TB-MAX-16");
    const md = readFileSync(result.markdownPath, "utf8");
    expect(md).toContain("5 candidates, 3 eligible, 2 excluded, 2 search angles.");
    expect(md).toContain(
      "| 1 | [Testbook Max 16](https://www.idealo.de/preisvergleich/OffersOfProduct/9004.html) | 1.799,00 € |",
    );
    expect(md).toContain("AMD Ryzen AI Max+ 395 (55.000)");
    expect(md).toContain("AI memory (GB, est.)");
    expect(md).toContain("## Excluded");
    expect(md).toContain("RAM (GB) 8 is below the minimum of 16.");
    expect(md).toContain("### Local AI chips");
    expect(md).toContain("Trusted offer: Alpha Shop");
  });
});
