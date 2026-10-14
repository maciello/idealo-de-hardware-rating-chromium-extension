/** Lowercases and strips trademark marks, exotic dashes and extra whitespace. Keeps all other characters. */
export function cleanText(text: string): string {
  return text
    .replace(/[®©™]/g, " ")
    .replace(/\((?:r|tm|c)\)/gi, " ")
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** "intel core i7-13700h" -> "intel-core-i7-13700h". `+` is kept (Ryzen AI Max+). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface StrippedName {
  readonly text: string;
  /** True when a "with Radeon ..." style tail was removed; such records rank behind the plain name. */
  readonly decorated: boolean;
}

/**
 * Removes what PassMark appends to a model name but listings never repeat:
 * "@ 3.40GHz", a trailing "3200 MHz" and "with Radeon ...".
 */
export function stripNameDecoration(cleaned: string): StrippedName {
  let text = cleaned.replace(/\s*@\s*\d+(?:[.,]\d+)?\s*ghz\b/g, "").replace(/\s+\d+\s*mhz$/, "");
  const withIndex = text.search(/\swith\s+(?:radeon|vega|amd)\b/);
  const decorated = withIndex >= 0;
  if (decorated) text = text.slice(0, withIndex);
  return { text: text.trim(), decorated };
}
