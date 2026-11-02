import { describe, expect, it } from "vitest";
import { poolCandidates } from "../src";
import { candidate } from "./helpers";

describe("poolCandidates", () => {
  const older = candidate({
    sku: "A",
    fetched_at: "2026-10-01",
    found_by: ["cheap"],
    notes: ["n1"],
    agent_flags: ["soldered_ram"],
    features: ["numpad"],
    ram_gb: 16,
  });
  const newer = candidate({
    sku: "A",
    fetched_at: "2026-10-20",
    found_by: ["light"],
    notes: ["n2"],
    agent_flags: ["refurbished"],
    features: ["numpad", "backlit_keyboard"],
    ram_gb: 32,
  });

  it("merges one sku, whatever the input order", () => {
    for (const entries of [
      [older, newer],
      [newer, older],
    ]) {
      const [pooled, ...rest] = poolCandidates([...entries, candidate({ sku: "B" })]);
      expect(rest).toHaveLength(1);
      expect(pooled?.ram_gb).toBe(32);
      expect([...(pooled?.found_by ?? [])].sort()).toEqual(["cheap", "light"]);
      expect([...(pooled?.notes ?? [])].sort()).toEqual(["n1", "n2"]);
      expect([...(pooled?.agent_flags ?? [])].sort()).toEqual(["refurbished", "soldered_ram"]);
      expect([...(pooled?.features ?? [])].sort()).toEqual(["backlit_keyboard", "numpad"]);
    }
  });
});
