import { type FilterCatalogSource, type FilterPage, filterPageOf } from "@idealo-hw/idealo-page";
import type { IdealoQuery } from "@idealo-hw/idealo-query";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { sendMessage } from "../../platform/messaging";
import type { Overlay } from "../../ui/host";
import { loadRequirements, saveRequirements } from "../requirements";
import { loadRequirementsContext, rememberingCatalog, vocabularyStorage } from "./adapters";
import { FilterBuilder } from "./connected";
import type { RequirementsStore } from "./model";

export interface FilterBuilderHandle {
  open(): void;
}

const requirementsStore: RequirementsStore = { load: loadRequirements, save: saveRequirements };

/**
 * Mounts the filter builder (floating button plus drawer) into the overlay on category and search
 * pages. Returns null elsewhere. `open` lets the popup open it through a message. Filter options
 * seen on earlier pages of a category are added to what `catalogSource` reads.
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
  const catalogs = rememberingCatalog(catalogSource, vocabularyStorage);

  let opened = false;
  let overlay: Overlay | undefined;
  const render = (): void => overlay?.render("filter-builder", <Panel />);
  const setOpened = (next: boolean): void => {
    opened = next;
    render();
  };

  // Stable identities: the builder re-loads the catalog whenever these change.
  const initialQuery = () => page().query;
  const loadCatalog = (query: IdealoQuery) =>
    catalogs.load({ document, url: location.href, query });
  const loadContext = (query: IdealoQuery) => loadRequirementsContext(document, query);
  const onApply = (url: string) => location.assign(url);
  const onOpenSettings = () => void sendMessage("openOptions", undefined);

  function Panel() {
    return (
      <FilterBuilder
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
