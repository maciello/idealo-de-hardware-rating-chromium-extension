import type { ProductInfo } from "./adapter";

const TITLE = "h1#oopStage-title";
const SPEC_ROWS = "section#datasheet table tr";

const collapse = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim();

/**
 * Product page from idealo's server-rendered markup: the title in `h1#oopStage-title` and the
 * datasheet table, whose rows are either a section header (one th, skipped) or a label/value pair of
 * cells. Specs come out as "Label<TAB>Value" lines, the shape hw-bench's parseSpecBlock reads.
 * Null when the page has no such title or no spec rows.
 */
export function ssrProductInfo(root: ParentNode): Omit<ProductInfo, "priceEur"> | null {
  const heading = root.querySelector(TITLE);
  const title = collapse(heading?.querySelector("span")?.textContent ?? heading?.textContent);
  if (heading === null || title === "") return null;
  const lines = [...root.querySelectorAll(SPEC_ROWS)].flatMap((row) => {
    const [label, value, ...rest] = row.querySelectorAll("td");
    if (!label || !value || rest.length > 0) return [];
    return [`${collapse(label.textContent)}\t${collapse(value.textContent)}`];
  });
  return lines.length === 0 ? null : { element: heading, title, specText: lines.join("\n") };
}
