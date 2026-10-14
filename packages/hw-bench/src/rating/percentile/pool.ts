import type { RatingGroup } from "../strategy";

/** The scores of one comparison group, sorted ascending. */
export interface Pool {
  readonly sorted: readonly number[];
  readonly group: RatingGroup;
}

/** Sorts `marks` in place; each `rate` call against the pool is then a binary search. */
export const poolOf = (marks: number[], group: RatingGroup): Pool => ({
  sorted: marks.sort((a, b) => a - b),
  group,
});
