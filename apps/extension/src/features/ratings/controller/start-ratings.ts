import type { PageAdapter } from "@idealo-hw/idealo-page";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { PageInspection, PageStats } from "../../../contracts";
import type { Overlay } from "../../../ui/host";
import { collectTargets, isOwnMutation, loadRatingView, watchRatingInputs } from "../adapters";
import { DEBOUNCE_MS } from "../config";
import { hasChip, isRated, type RatingView, rateQueries } from "../model";
import { createChipReconciler } from "./chip-reconciler";
import { createScanLoop } from "./scan-loop";
import type { ChipRenderer, TileRating } from "./types";

export interface RatingsHandle {
  /** Fresh stats for the popup: products found, products with a rating. */
  stats(): Promise<PageStats>;
  /** Fresh per-item view of what was read and rated, for the debug report. */
  inspect(): Promise<PageInspection>;
}

/** Keeps exactly one chip per rated element, in sync with the DOM and the user's settings. */
export function startRatingsController(
  ctx: ContentScriptContext,
  adapter: PageAdapter,
  getOverlay: () => Promise<Overlay>,
  renderChip: ChipRenderer,
): RatingsHandle {
  const reconciler = createChipReconciler(ctx, renderChip);
  let view: Promise<RatingView> | undefined;
  let stats: PageStats = { kind: adapter.detect(location.href), rated: 0, total: 0 };
  let inspection: PageInspection = { kind: stats.kind, items: [] };

  const scan = async (): Promise<void> => {
    const targets = collectTargets(adapter);
    let results: TileRating[] = [];
    let current: RatingView | undefined;
    if (targets.length > 0) {
      view ??= loadRatingView();
      current = await view;
      const rated = rateQueries(
        current,
        targets.map((t) => t.query),
      );
      results = targets.flatMap((target, i) => {
        const found = rated[i];
        return found === undefined ? [] : [{ target, ...found }];
      });
    }
    const kind = adapter.detect(location.href);
    stats = { kind, total: targets.length, rated: results.filter(isRated).length };
    inspection = {
      kind,
      items: results.map((result) => ({ ...result.target.seen, rated: isRated(result) })),
    };
    if (results.some(hasChip) && current) {
      reconciler.sync(await getOverlay(), current, results);
    } else if (reconciler.size > 0) {
      reconciler.dropAll(await getOverlay());
    }
  };

  const loop = createScanLoop(scan);

  const observer = new MutationObserver((mutations) => {
    if (!mutations.every(isOwnMutation)) loop.schedule(DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const unwatch = watchRatingInputs(() => {
    view = undefined;
    loop.schedule(0);
  });

  ctx.onInvalidated(() => {
    observer.disconnect();
    loop.stop();
    unwatch();
  });
  loop.schedule(0);

  return {
    async stats() {
      await scan();
      return stats;
    },
    async inspect() {
      await scan();
      return inspection;
    },
  };
}
