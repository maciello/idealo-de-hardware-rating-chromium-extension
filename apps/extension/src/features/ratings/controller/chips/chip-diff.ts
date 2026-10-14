/** What a chip on the page is now, as far as the diff cares. */
export interface ChipState {
  signature: string;
  /** False once the page replaced the element the chip hangs from, so the chip is orphaned. */
  attached: boolean;
}

/** A chip the latest scan wants on `element`. */
export interface WantedChip<K> {
  element: K;
  signature: string;
}

/** What to do for one wanted chip: leave it, redraw it, create it, or drop the orphan and create it again. */
export type ChipAction = "keep" | "update" | "add" | "replace";

export interface ChipDiff<K> {
  /** One action per wanted chip, in the order they were wanted. */
  actions: ChipAction[];
  /** Elements that carry a chip but are no longer wanted. */
  drop: K[];
}

const actionFor = (existing: ChipState | undefined, signature: string): ChipAction => {
  if (existing === undefined) return "add";
  if (!existing.attached) return "replace";
  return existing.signature === signature ? "keep" : "update";
};

/** Pure, generic in the element so it needs no DOM: compares the chips on the page with the chips the scan wants. */
export function diffChips<K>(
  current: ReadonlyMap<K, ChipState>,
  wanted: readonly WantedChip<K>[],
): ChipDiff<K> {
  const live = new Set(wanted.map((chip) => chip.element));
  return {
    actions: wanted.map((chip) => actionFor(current.get(chip.element), chip.signature)),
    drop: [...current.keys()].filter((element) => !live.has(element)),
  };
}
