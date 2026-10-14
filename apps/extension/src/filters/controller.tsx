import { type IdealoQuery, parseIdealoUrl } from "@idealo-hw/idealo-query";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { sendMessage } from "../messaging";
import { mountReact } from "../ui/mount";
import type { FilterCatalogSource } from "./catalog-source";
import { FilterPanel } from "./FilterPanel";

const currentQuery = (): IdealoQuery | null => {
  const parsed = parseIdealoUrl(location.href);
  return parsed.kind === "category" ? parsed.query : null;
};

/** Mounts the floating filter builder on category pages. */
export async function startFilterBuilder(
  ctx: ContentScriptContext,
  catalogSource: FilterCatalogSource,
): Promise<void> {
  const query = currentQuery();
  if (query === null) return;
  await mountReact(ctx, {
    name: "idealo-hw-filter",
    anchor: document.body,
    isolateEvents: true,
    node: (
      <FilterPanel
        initialQuery={() => currentQuery() ?? query}
        loadCatalog={(q) => catalogSource.load({ document, url: location.href, query: q })}
        onApply={(url) => location.assign(url)}
        onOpenSettings={() => void sendMessage("openOptions", undefined)}
      />
    ),
  });
}
