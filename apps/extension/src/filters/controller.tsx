import type { IdealoQuery } from "@idealo-hw/idealo-query";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { sendMessage } from "../messaging";
import { formFactorOfCategory } from "../page/device-class";
import { createModelScorer } from "../requirements/scorer";
import { loadRequirements, saveRequirements } from "../requirements/storage";
import { loadCpuSnapshot, loadGpuSnapshot } from "../storage/items";
import type { Overlay } from "../ui/host";
import type { FilterCatalogSource } from "./catalog-source";
import { embeddedPriceBounds } from "./embedded-catalog";
import { FilterPanel, type RequirementsContext, type RequirementsStore } from "./FilterPanel";
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
  const loadContext = async (query: IdealoQuery): Promise<RequirementsContext> => {
    const [cpu, gpu] = await Promise.all([loadCpuSnapshot(), loadGpuSnapshot()]);
    return {
      scorer: createModelScorer(cpu, gpu, formFactorOfCategory(query.categoryId)),
      hasData: { cpu: cpu !== null, gpu: gpu !== null },
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
