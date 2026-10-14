import type { Rating } from "@idealo-hw/hw-bench";
import { describe, expect, it } from "vitest";
import { ratingDisplay, ratingExplanation } from "../../../../../src/features/ratings/view-model";
import { lowerBoundNote } from "../../../../../src/features/ratings/view-model/rating-text";

const score = (metric: "cpu_mark" | "cpu_single" | "g3d_mark", value: number, subject: string) =>
  ({ kind: "score", strategyId: "s", value, metric, subject }) satisfies Rating;

const percentile = (
  value: number,
  rest: Omit<Extract<Rating, { kind: "percentile" }>, "kind" | "strategyId" | "value">,
) => ({ kind: "percentile", strategyId: "p", value, ...rest }) satisfies Rating;

describe("ratingExplanation", () => {
  it.each([
    [
      score("cpu_mark", 28_501, "Testcorp Core X1-1000"),
      "PassMark CPU Mark (multi-thread) of Testcorp Core X1-1000: 28.501.",
    ],
    [
      score("cpu_single", 3_566, "Testcorp Core X1-1000"),
      "PassMark single-thread rating of Testcorp Core X1-1000: 3.566.",
    ],
    [
      score("g3d_mark", 16_000, "GeForce RTX 9060 Laptop GPU"),
      "PassMark G3D Mark of GeForce RTX 9060 Laptop GPU: 16.000.",
    ],
    [
      {
        kind: "per_euro",
        strategyId: "v",
        value: 50,
        metric: "cpu_mark",
        score: 20_000,
        priceEur: 400,
      },
      "20.000 CPU Mark for 400,0 EUR = 50,0 points per euro.",
    ],
    [
      {
        kind: "per_euro",
        strategyId: "v",
        value: 23.115577889447234,
        metric: "g3d_mark",
        score: 9_246,
        priceEur: 399.99,
      },
      "9.246 G3D Mark for 400,0 EUR = 23,1 points per euro.",
    ],
    [
      percentile(83.33333333333334, {
        metric: "cpu_mark",
        score: 53_465,
        sampleSize: 12,
        group: "desktop",
        cohort: { sinceYear: 2022, minScore: 12_345 },
      }),
      "CPU Mark 53.465 is at the 83th percentile of 12 desktop CPUs first seen 2022 or later, scoring at least 12.345 in the imported snapshot.",
    ],
    [
      percentile(26.666666666666668, {
        metric: "cpu_mark",
        score: 14_501,
        sampleSize: 1_500,
        group: "laptop",
        cohort: { sinceYear: 2022, minScore: null },
      }),
      "CPU Mark 14.501 is at the 27th percentile of 1.500 laptop CPUs first seen 2022 or later in the imported snapshot.",
    ],
    [
      percentile(40, {
        metric: "g3d_mark",
        score: 2_500,
        sampleSize: 5,
        group: "laptop",
        cohort: { sinceYear: null, minScore: 1_000 },
      }),
      "G3D Mark 2.500 is at the 40th percentile of 5 laptop GPUs scoring at least 1.000 in the imported snapshot.",
    ],
    [
      percentile(75, {
        metric: "g3d_mark",
        score: 16_000,
        sampleSize: 4,
        group: "desktop",
        cohort: { sinceYear: null, minScore: null },
      }),
      "G3D Mark 16.000 is at the 75th percentile of 4 desktop GPUs in the imported snapshot.",
    ],
    [
      percentile(75, {
        metric: "cpu_mark",
        score: 25_000,
        sampleSize: 4,
        group: "listing",
        cohort: null,
      }),
      "CPU Mark 25.000 ranks at the 75th percentile of 4 products in this listing.",
    ],
  ] satisfies [Rating, string][])("words %#", (rating, expected) => {
    expect(ratingExplanation(rating)).toBe(expected);
  });

  it("names the cards a lower-bound GPU could be", () => {
    expect(lowerBoundNote(["GeForce RTX 4060 Laptop GPU", "GeForce RTX 4060"])).toBe(
      " Lower bound: the text matches 2 cards (GeForce RTX 4060 Laptop GPU, GeForce RTX 4060); this is the weakest.",
    );
  });
});

describe("ratingDisplay", () => {
  it("shows a score as an integer, points per euro with one decimal and a percentile as P<n>", () => {
    expect(ratingDisplay(score("cpu_mark", 28_501, ""))).toBe("28.501");
    expect(
      ratingDisplay({
        kind: "per_euro",
        strategyId: "v",
        value: 50,
        metric: "cpu_mark",
        score: 1,
        priceEur: 1,
      }),
    ).toBe("50,0/€");
    expect(
      ratingDisplay(
        percentile(77.4, {
          metric: "cpu_mark",
          score: 1,
          sampleSize: 2,
          group: "listing",
          cohort: null,
        }),
      ),
    ).toBe("P77");
  });
});
