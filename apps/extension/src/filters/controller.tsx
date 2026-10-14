import {
  embeddedPriceBounds,
  type FilterCatalogSource,
  type FilterPage,
  filterPageOf,
  formFactorOfCategory,
} from "@idealo-hw/idealo-page";
import type { IdealoQuery } from "@idealo-hw/idealo-query";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { loadRequirements, loadScorerSource, saveRequirements } from "../features/requirements";
import { sendMessage } from "../platform/messaging";
import type { Overlay } from "../ui/host";
import { FilterPanel, type RequirementsContext, type RequirementsStore } from "./FilterPanel";

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
  const loadContext = async (query: IdealoQuery): Promise<RequirementsContext> => {
    const { scorer, hasData } = await loadScorerSource(formFactorOfCategory(query.categoryId));
    return {
      scorer,
      hasData,
      priceBounds: embeddedPriceBounds(document, query.categoryId),
    };
  };
  const requirementsStore: RequirementsStore = {
    load: loadRequirements,
    save: saveRequirements,
  };
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
        loadContext={loadContext}
        requirementsStore={requirementsStore}
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
