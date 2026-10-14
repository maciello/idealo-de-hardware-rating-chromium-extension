/** The scores of one comparison group, sorted ascending, with the plural noun that names the group. */
export interface Pool {
  readonly sorted: readonly number[];
  /** Plural noun for the explanation, e.g. "laptop CPUs". */
  readonly noun: string;
}

/** Sorts `marks` in place; each `rate` call against the pool is then a binary search. */
export const poolOf = (marks: number[], noun: string): Pool => ({
  sorted: marks.sort((a, b) => a - b),
  noun,
});
