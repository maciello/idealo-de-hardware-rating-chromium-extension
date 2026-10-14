import type { ReactNode } from "react";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { recordError } from "../../../../platform/errors";
import type { Overlay } from "../../../../ui/host";
import { anchorPosition, type ChipHost, mountChipHost } from "../../adapters";
import { hasChip, type RatingView, signatureOf, visibleCpu } from "../../model";
import type { ChipRenderer, TileRating } from "../types";
import { type ChipState, diffChips } from "./chip-diff";

interface ChipEntry {
  id: string;
  signature: string;
  node: ReactNode;
  host?: ChipHost;
  /** Set when the entry was dropped while its host was still being created. */
  gone?: boolean;
  restorePosition: () => void;
}

export interface ChipReconciler {
  /** Makes exactly one chip per rated element: adds, re-renders on a changed signature, drops the rest. */
  sync(overlay: Overlay, view: RatingView, results: readonly TileRating[]): void;
  dropAll(overlay: Overlay): void;
  /** Chips currently on the page. */
  readonly size: number;
}

interface Wanted {
  result: TileRating;
  signature: string;
  node: ReactNode;
}

/** Carries out `diffChips` against the page: mounts hosts, renders into the overlay, removes orphans. */
export function createChipReconciler(
  ctx: ContentScriptContext,
  renderChip: ChipRenderer,
): ChipReconciler {
  const chips = new Map<Element, ChipEntry>();
  let nextId = 0;

  const drop = (element: Element, entry: ChipEntry, overlay: Overlay): void => {
    chips.delete(element);
    entry.gone = true;
    overlay.clear(entry.id);
    entry.host?.remove();
    entry.restorePosition();
  };

  const add = (overlay: Overlay, { result, signature, node }: Wanted) => {
    const { target } = result;
    const { element } = target;
    const entry: ChipEntry = {
      id: `chip-${nextId++}`,
      signature,
      node,
      restorePosition: target.placement === "corner" ? anchorPosition(element) : () => undefined,
    };
    chips.set(element, entry);
    void mountChipHost(ctx, element, target.placement)
      .then((host) => {
        if (entry.gone) {
          host.remove();
          return;
        }
        entry.host = host;
        overlay.render(entry.id, entry.node, host.container);
      })
      .catch((error: unknown) => recordError("content", error));
  };

  const update = (entry: ChipEntry, { signature, node }: Wanted, overlay: Overlay): void => {
    entry.signature = signature;
    entry.node = node;
    if (entry.host) overlay.render(entry.id, node, entry.host.container);
  };

  const stateOf = (element: Element, entry: ChipEntry): ChipState => ({
    signature: entry.signature,
    attached: entry.host === undefined || element.contains(entry.host.host),
  });

  return {
    get size() {
      return chips.size;
    },
    sync(overlay, view, results) {
      const wanted = results.filter(hasChip).map(
        (result): Wanted => ({
          result,
          node: renderChip({
            rating: visibleCpu(result.rating),
            gpu: result.gpu,
            signals: result.signals,
            primaryId: view.primaryId,
            importedAt: view.importedAt,
          }),
          signature: `${view.primaryId}|${view.importedAt}|${signatureOf(result.rating, result.gpu, result.signals)}`,
        }),
      );
      const current = new Map(
        [...chips].map(([element, entry]) => [element, stateOf(element, entry)]),
      );
      const { actions, drop: stale } = diffChips(
        current,
        wanted.map(({ result, signature }) => ({ element: result.target.element, signature })),
      );
      wanted.forEach((item, i) => {
        const { element } = item.result.target;
        const existing = chips.get(element);
        const action = actions[i];
        if (existing && action === "update") update(existing, item, overlay);
        if (existing && action === "replace") drop(element, existing, overlay);
        if (action === "add" || action === "replace") add(overlay, item);
      });
      for (const element of stale) {
        const entry = chips.get(element);
        if (entry) drop(element, entry, overlay);
      }
    },
    dropAll(overlay) {
      for (const [element, entry] of chips) drop(element, entry, overlay);
    },
  };
}
