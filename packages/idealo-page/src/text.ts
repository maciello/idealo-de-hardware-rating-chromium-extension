/** Whitespace-collapsed, trimmed text; empty for a missing node. */
export const collapse = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim();
