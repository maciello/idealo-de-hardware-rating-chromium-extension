import type { ReactNode } from "react";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { recordError } from "../../../platform/errors";
import type { Overlay } from "../../../ui/host";
import { anchorPosition, type ChipHost, mountChipHost } from "../adapters";
import { hasChip, type RatingView, signatureOf, visibleCpu } from "../model";
import type { ChipRenderer, TileRating } from "./types";

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

  const add = (overlay: Overlay, { target }: TileRating, signature: string, node: ReactNode) => {
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

  return {
    get size() {
      return chips.size;
    },
    sync(overlay, view, results) {
      const live = new Set<Element>();
      for (const result of results) {
        const { target, rating, gpu, signals } = result;
        if (!hasChip(result)) continue;
        const { element } = target;
        live.add(element);
        const node = renderChip({
          rating: visibleCpu(rating),
          gpu,
          signals,
          primaryId: view.primaryId,
          importedAt: view.importedAt,
        });
        const signature = `${view.primaryId}|${view.importedAt}|${signatureOf(rating, gpu, signals)}`;
        const existing = chips.get(element);
        if (existing && (existing.host === undefined || element.contains(existing.host.host))) {
          if (existing.signature !== signature) {
            existing.signature = signature;
            existing.node = node;
            if (existing.host) overlay.render(existing.id, node, existing.host.container);
          }
          continue;
        }
        if (existing) drop(element, existing, overlay);
        add(overlay, result, signature, node);
      }
      for (const [element, entry] of chips) if (!live.has(element)) drop(element, entry, overlay);
    },
    dropAll(overlay) {
      for (const [element, entry] of chips) drop(element, entry, overlay);
    },
  };
}
