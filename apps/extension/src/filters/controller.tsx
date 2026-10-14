import type { IdealoQuery } from "@idealo-hw/idealo-query";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { sendMessage } from "../messaging";
import type { Overlay } from "../ui/overlay";
import type { FilterCatalogSource } from "./catalog-source";
import { FilterPanel } from "./FilterPanel";
import { type FilterPage, filterPageOf } from "./page";

export interface FilterBuilderHandle {
  open(): void;
}

/**
 * Mounts the filter builder (floating button plus drawer) into the overlay on category and search
 * pages. Returns null elsewhere. `open` lets the popup open it through a message.
 */
export function startFilterBuilder(
  ctx: ContentScriptContext,
  catalogSource: FilterCatalogSource,
  getOverlay: () => Promise<Overlay>,
): FilterBuilderHandle | null {
  const found = filterPageOf(location.href, document);
  if (found === null) return null;
  const first: FilterPage = found;
  const page = (): FilterPage => filterPageOf(location.href, document) ?? first;

  let opened = false;
  let overlay: Overlay | undefined;
  const render = (): void => overlay?.render("filter-builder", <Panel />);
  const setOpened = (next: boolean): void => {
    opened = next;
    render();
  };

  // Stable identities: FilterPanel re-loads the catalog whenever these change.
  const initialQuery = () => page().query;
  const loadCatalog = (query: IdealoQuery) =>
    catalogSource.load({ document, url: location.href, query });
  const onApply = (url: string) => location.assign(url);
  const onOpenSettings = () => void sendMessage("openOptions", undefined);

  function Panel() {
    return (
      <FilterPanel
        opened={opened}
        onOpenedChange={setOpened}
        initialQuery={initialQuery}
        toUrl={first.toUrl}
        canFilter={first.canFilter}
        loadCatalog={loadCatalog}
        onApply={onApply}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  const ready = getOverlay().then((o) => {
    overlay = o;
    render();
  });
  ctx.onInvalidated(() => overlay?.clear("filter-builder"));
  return {
    open() {
      void ready.then(() => setOpened(true));
    },
  };
}
