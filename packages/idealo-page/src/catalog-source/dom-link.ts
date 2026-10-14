import {
  type FilterCatalog,
  type FilterGroup,
  type FilterOption,
  filterId,
  parseIdealoUrl,
} from "@idealo-hw/idealo-query";
import { collapse } from "../text";
import type { FilterCatalogSource } from "./port";

const OTHER_GROUP = "Other";
const HEADING = "legend, h1, h2, h3, h4, h5, h6, [role='heading']";
const MAX_CLIMB = 8;

/** Result counts such as "(1.234)" are not part of the label. */
const stripCount = (label: string): string => label.replace(/\s*\(\d[\d.]*\)\s*$/, "").trim();
const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The id that differs between two filter sets when they differ by exactly one id. */
function singleDifference(
  current: readonly string[],
  other: readonly string[],
): string | undefined {
  const a = new Set(current);
  const b = new Set(other);
  const added = [...b].filter((id) => !a.has(id));
  const removed = [...a].filter((id) => !b.has(id));
  if (added.length === 1 && removed.length === 0) return added[0];
  if (removed.length === 1 && added.length === 0) return removed[0];
  return undefined;
}

/** Nearest legend/heading: the enclosing fieldset's legend, else a heading before the anchor's branch. */
function groupNameOf(anchor: Element): string {
  const fieldsetLegend = anchor.closest("fieldset")?.querySelector("legend");
  if (fieldsetLegend) return collapse(fieldsetLegend.textContent) || OTHER_GROUP;
  let branch: Element | null = anchor;
  for (let depth = 0; depth < MAX_CLIMB && branch; depth++, branch = branch.parentElement) {
    for (
      let sibling = branch.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      const heading = sibling.matches(HEADING)
        ? sibling
        : sibling.querySelector("a") // a sibling holding links is another group, not a title block
          ? null
          : sibling.querySelector(HEADING);
      if (heading && collapse(heading.textContent)) return collapse(heading.textContent);
    }
  }
  return OTHER_GROUP;
}

/**
 * Derives filter options from the page's own links: an anchor that leads to the same category with
 * the current filter ids plus (or minus) exactly one id is that id's toggle link.
 */
export const domLinkCatalog: FilterCatalogSource = {
  id: "dom_link",
  async load({ document, query }) {
    const groups = new Map<string, FilterGroup>();
    const seen = new Set<string>();
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const parsed = parseIdealoUrl(anchor.getAttribute("href") ?? "");
      if (parsed.kind !== "category" || parsed.query.categoryId !== query.categoryId) continue;
      const id = singleDifference(query.filterIds, parsed.query.filterIds);
      const label = stripCount(collapse(anchor.textContent || anchor.getAttribute("aria-label")));
      if (id === undefined || label === "" || seen.has(id)) continue;
      seen.add(id);
      const name = groupNameOf(anchor);
      const key = slug(name) || slug(OTHER_GROUP);
      const group = groups.get(key) ?? { attributeId: key, name, filters: [] };
      const option: FilterOption = { filterId: filterId(id), label };
      group.filters.push(option);
      groups.set(key, group);
    }
    if (groups.size === 0) return null;
    const catalog: FilterCatalog = {
      categoryId: query.categoryId,
      groups: [...groups.values()],
      manufacturers: [],
    };
    return catalog;
  },
};
