import { describe, expect, it } from "vitest";
import {
  type ChipState,
  diffChips,
} from "../../../../../src/features/ratings/controller/chips/chip-diff";

const state = (signature: string, attached = true): ChipState => ({ signature, attached });

describe("diffChips", () => {
  it("adds a chip for an element that has none", () => {
    expect(diffChips(new Map(), [{ element: "a", signature: "1" }])).toEqual({
      actions: ["add"],
      drop: [],
    });
  });

  it("keeps a chip whose signature is unchanged and redraws one whose signature changed", () => {
    const current = new Map([
      ["a", state("1")],
      ["b", state("1")],
    ]);
    expect(
      diffChips(current, [
        { element: "a", signature: "1" },
        { element: "b", signature: "2" },
      ]),
    ).toEqual({ actions: ["keep", "update"], drop: [] });
  });

  it("replaces a chip whose host the page removed, even when nothing changed", () => {
    const current = new Map([["a", state("1", false)]]);
    expect(diffChips(current, [{ element: "a", signature: "1" }]).actions).toEqual(["replace"]);
  });

  it("drops the chips of elements that are no longer wanted", () => {
    const current = new Map([
      ["a", state("1")],
      ["b", state("1")],
      ["c", state("1")],
    ]);
    expect(diffChips(current, [{ element: "b", signature: "1" }])).toEqual({
      actions: ["keep"],
      drop: ["a", "c"],
    });
  });

  it("answers in the order the chips were wanted", () => {
    const current = new Map([["b", state("1")]]);
    expect(
      diffChips(current, [
        { element: "a", signature: "1" },
        { element: "b", signature: "9" },
        { element: "c", signature: "1" },
      ]).actions,
    ).toEqual(["add", "update", "add"]);
  });
});
