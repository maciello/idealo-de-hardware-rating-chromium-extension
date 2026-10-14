/** Tile spec fragments ("Intel Core i5-10210U", "32 GB RAM") or datasheet lines; free text stays one piece. */
export const fragmentsOf = (text: string): string[] =>
  text
    .split(/\n|,\s+/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment !== "");
