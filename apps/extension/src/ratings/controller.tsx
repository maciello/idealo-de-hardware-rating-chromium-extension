import type { ReactNode } from "react";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { PageStats } from "../messaging";
import { sendMessage } from "../messaging";
import type { PageAdapter } from "../page/adapter";
import { cpuSnapshotItem, loadCpuSnapshot, loadSettings, settingsItem } from "../storage/items";
import { type ChipHost, type ChipPlacement, mountChipHost } from "../ui/chip-host";
import type { Overlay } from "../ui/overlay";
import {
  createRatingEngine,
  type ItemRating,
  type RatingEngine,
  type RatingQuery,
  resolveEnabledStrategyIds,
} from "./engine";
import { DEFAULT_PRIMARY_ID } from "./present";
import { RatingChip } from "./RatingChip";

const DEBOUNCE_MS = 250;

interface Target {
  element: Element;
  query: RatingQuery;
  placement: ChipPlacement;
}

interface ChipEntry {
  id: string;
  signature: string;
  node: ReactNode;
  host?: ChipHost;
  /** Set when the entry was dropped while its host was still being created. */
  gone?: boolean;
  restorePosition: () => void;
}

interface View {
  engine: RatingEngine | null;
  primaryId: string;
  importedAt: string | null;
}

export interface RatingsHandle {
  /** Fresh stats for the popup: products found, products with a rating. */
  stats(): Promise<PageStats>;
}

const isVisible = (rating: ItemRating): boolean =>
  rating.status === "ambiguous" || (rating.status === "matched" && rating.ratings.length > 0);

const signatureOf = (rating: ItemRating): string => {
  if (rating.status === "matched") {
    const values = rating.ratings.map((r) => `${r.strategyId}=${r.value}`).join(",");
    const rank = rating.pageRank ? `${rating.pageRank.rank}/${rating.pageRank.total}` : "-";
    return `m:${rating.record.id}:${values}:${rank}`;
  }
  return rating.status === "ambiguous" ? `a:${rating.candidates.map((c) => c.id).join(",")}` : "n";
};

function collectTargets(adapter: PageAdapter): Target[] {
  const kind = adapter.detect(location.href);
  if (kind === "listing") {
    return adapter.listingItems(document).map((item) => ({
      element: item.element,
      placement: "corner",
      query: { title: item.title, text: item.text, priceEur: item.priceEur },
    }));
  }
  if (kind === "product") {
    const info = adapter.productInfo(document);
    if (info?.element) {
      return [
        {
          element: info.element,
          placement: "inline",
          query: { title: info.title, text: info.specText, priceEur: info.priceEur },
        },
      ];
    }
  }
  return [];
}

/** The chip is absolutely positioned in its tile; a static tile becomes the containing block. */
function anchorPosition(element: Element): () => void {
  if (!(element instanceof HTMLElement) || getComputedStyle(element).position !== "static") {
    return () => undefined;
  }
  const previous = element.style.position;
  element.style.position = "relative";
  return () => {
    element.style.position = previous;
  };
}

const isOwnMutation = (mutation: MutationRecord): boolean =>
  [...mutation.addedNodes, ...mutation.removedNodes].every(
    (node) => node instanceof Element && node.localName.startsWith("idealo-hw-"),
  );

/** Keeps exactly one chip per rated element, in sync with the DOM and the user's settings. */
export function startRatings(
  ctx: ContentScriptContext,
  adapter: PageAdapter,
  getOverlay: () => Promise<Overlay>,
): RatingsHandle {
  const chips = new Map<Element, ChipEntry>();
  let view: Promise<View> | undefined;
  let running = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextId = 0;
  let stats: PageStats = { kind: adapter.detect(location.href), rated: 0, total: 0 };

  const buildView = async (): Promise<View> => {
    const [snapshot, settings] = await Promise.all([loadCpuSnapshot(), loadSettings()]);
    return {
      engine:
        snapshot === null
          ? null
          : createRatingEngine(snapshot, resolveEnabledStrategyIds(settings?.enabledStrategyIds)),
      primaryId: settings?.primaryStrategyId ?? DEFAULT_PRIMARY_ID,
      importedAt: snapshot?.importedAt ?? null,
    };
  };

  const drop = (element: Element, entry: ChipEntry, overlay: Overlay): void => {
    chips.delete(element);
    entry.gone = true;
    overlay.clear(entry.id);
    entry.host?.remove();
    entry.restorePosition();
  };

  const sync = (
    overlay: Overlay,
    current: View,
    results: readonly { target: Target; rating: ItemRating }[],
  ): void => {
    const live = new Set<Element>();
    for (const { target, rating } of results) {
      if (rating.status === "no_match" || !isVisible(rating)) continue;
      const { element } = target;
      live.add(element);
      const node = (
        <RatingChip
          rating={rating}
          primaryId={current.primaryId}
          importedAt={current.importedAt}
          onOpenSettings={() => void sendMessage("openOptions", undefined)}
        />
      );
      const signature = `${current.primaryId}|${current.importedAt}|${signatureOf(rating)}`;
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
      const entry: ChipEntry = {
        id: `chip-${nextId++}`,
        signature,
        node,
        restorePosition: target.placement === "corner" ? anchorPosition(element) : () => undefined,
      };
      chips.set(element, entry);
      void mountChipHost(ctx, element, target.placement).then((host) => {
        if (entry.gone) {
          host.remove();
          return;
        }
        entry.host = host;
        overlay.render(entry.id, entry.node, host.container);
      });
    }
    for (const [element, entry] of chips) if (!live.has(element)) drop(element, entry, overlay);
  };

  const scan = async (): Promise<void> => {
    const targets = collectTargets(adapter);
    let ratings: ItemRating[] = [];
    let current: View | undefined;
    if (targets.length > 0) {
      view ??= buildView();
      current = await view;
      ratings = current.engine?.rate(targets.map((t) => t.query)) ?? [];
    }
    const results = targets.flatMap((target, i) => {
      const rating = ratings[i];
      return rating ? [{ target, rating }] : [];
    });
    stats = {
      kind: adapter.detect(location.href),
      total: targets.length,
      rated: results.filter(({ rating }) => rating.status === "matched" && isVisible(rating))
        .length,
    };
    if (results.some(({ rating }) => isVisible(rating)) && current) {
      sync(await getOverlay(), current, results);
    } else if (chips.size > 0) {
      const overlay = await getOverlay();
      for (const [element, entry] of chips) drop(element, entry, overlay);
    }
  };

  const refresh = async (): Promise<void> => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      do {
        rerun = false;
        await scan();
      } while (rerun);
    } finally {
      running = false;
    }
  };

  const schedule = (delay: number): void => {
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(), delay);
  };

  const observer = new MutationObserver((mutations) => {
    if (!mutations.every(isOwnMutation)) schedule(DEBOUNCE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const invalidate = (): void => {
    view = undefined;
    schedule(0);
  };
  const unwatch = [cpuSnapshotItem.watch(invalidate), settingsItem.watch(invalidate)];

  ctx.onInvalidated(() => {
    observer.disconnect();
    clearTimeout(timer);
    for (const stop of unwatch) stop();
  });
  schedule(0);

  return {
    async stats() {
      await scan();
      return stats;
    },
  };
}
