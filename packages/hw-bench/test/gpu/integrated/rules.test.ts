import { describe, expect, it } from "vitest";
import { IGPU_RULES } from "../../../src/gpu";

describe("IGPU_RULES", () => {
  it("has unique ids", () => {
    const ids = IGPU_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every rule to the declared keys and gives it at least one", () => {
    for (const rule of IGPU_RULES) {
      expect(Object.keys(rule.match).length, rule.id).toBeGreaterThan(0);
    }
  });

  it("states a confidence in (0, 1] and https evidence; only unrated graphics may lack evidence", () => {
    for (const rule of IGPU_RULES) {
      expect(rule.confidence, rule.id).toBeGreaterThan(0);
      expect(rule.confidence, rule.id).toBeLessThanOrEqual(1);
      for (const url of rule.evidence) expect(url, rule.id).toMatch(/^https:\/\/\S+$/);
      if (rule.evidence.length === 0) expect(rule.igpu.kind, rule.id).toBe("unrated");
    }
  });

  it("opens each vendor's rules with its no-graphics rules, so F parts never reach an iGPU rule", () => {
    const firstGraphics = IGPU_RULES.findIndex(
      (rule) => rule.igpu.kind !== "none" && rule.match.vendor === "Intel",
    );
    const lastIntelNone = IGPU_RULES.findLastIndex(
      (rule) => rule.igpu.kind === "none" && rule.match.vendor === "Intel",
    );
    expect(lastIntelNone).toBeLessThan(firstGraphics);
    const firstAmd = IGPU_RULES.findIndex(
      (rule) => rule.igpu.kind !== "none" && rule.match.vendor === "AMD",
    );
    const lastAmdNone = IGPU_RULES.findLastIndex(
      (rule) => rule.igpu.kind === "none" && rule.match.vendor === "AMD",
    );
    expect(lastAmdNone).toBeLessThan(firstAmd);
  });

  it("carries names, ids, caveats and links only: no benchmark numbers", () => {
    // The table is public. A PassMark score or sample count would show up as a numeric field or an n=/pm= note.
    for (const rule of IGPU_RULES) {
      expect(Object.keys(rule).sort(), rule.id).toEqual(
        ["caveat", "confidence", "evidence", "id", "igpu", "match"].sort(),
      );
      expect(rule.caveat, rule.id).not.toMatch(/\b(?:pm|n|g3d|samples)=\d/i);
      expect(rule.caveat, rule.id).not.toMatch(/low_samples=\d/);
    }
  });
});
