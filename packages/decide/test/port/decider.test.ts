import { describe, expect, it } from "vitest";
import { type DecisionCandidate, noopDecider } from "../../src";
import { catalog } from "../catalog-fixture";

const candidates: DecisionCandidate[] = [{ id: "101", label: "Testcorp Chip 1000" }];
const state = { cpu_text: "Testcorp Chip 1000 Pro Edition", product_title: "Widget" };
const question = "Which entry is the chip in `cpu_text`?";

describe("noopDecider", () => {
  it("never decides", async () => {
    expect(await noopDecider.chooseRecord({ state, question, candidates })).toMatchObject({
      chosenId: null,
      probabilities: {},
    });
    expect(await noopDecider.selectFilters({ request: "x", catalog })).toMatchObject({
      filterIds: [],
      perFilter: [],
    });
  });
});
