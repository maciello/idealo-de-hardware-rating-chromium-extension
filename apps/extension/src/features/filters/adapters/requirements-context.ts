import { embeddedPriceBounds, formFactorOfCategory } from "@idealo-hw/idealo-page";
import type { IdealoQuery } from "@idealo-hw/idealo-query";
import { loadScorerSource } from "../../requirements";
import type { RequirementsContext } from "../model";

/** Reads what the requirement controls need for the page's category: the scorer and its price span. */
export async function loadRequirementsContext(
  doc: Document,
  query: IdealoQuery,
): Promise<RequirementsContext> {
  const { scorer, hasData } = await loadScorerSource(formFactorOfCategory(query.categoryId));
  return { scorer, hasData, priceBounds: embeddedPriceBounds(doc, query.categoryId) };
}
