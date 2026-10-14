import type { GpuMatchRating } from "@idealo-hw/hw-bench";
import type { PageAdapter } from "@idealo-hw/idealo-page";
import type { ReactNode } from "react";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { InspectedItem, PageInspection, PageStats } from "../contracts";
import { listingFormFactor, productFormFactor } from "../page/device-class";
import { recordError } from "../platform/errors";
import { sendMessage } from "../platform/messaging";
import {
  cohortPolicyItem,
  cpuSnapshotItem,
  gpuSnapshotItem,
  loadCohortPolicy,
  loadCpuSnapshot,
  loadGpuSnapshot,
  loadSettings,
  settingsItem,
} from "../platform/storage";
import { type ChipHost, type ChipPlacement, mountChipHost } from "../ui/chip-host";
import type { Overlay } from "../ui/host";
import {
  createRatingEngine,
  type ItemRating,
  type RatingEngine,
  type RatingQuery,
  resolveEnabledStrategyIds,
} from "./engine";
import { createGpuEngine, type GpuEngine } from "./gpu-engine";
import { DEFAULT_PRIMARY_ID } from "./present";
import { RatingChip } from "./RatingChip";
import { signatureOf } from "./signature";

const DEBOUNCE_MS = 250;

interface Target {
  element: Element;
  query: RatingQuery;
  placement: ChipPlacement;
  /** What the adapter read, for the debug report. */
  seen: Omit<InspectedItem, "rated">;
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
  gpuEngine: GpuEngine | null;
  primaryId: string;
  importedAt: string | null;
}

export interface RatingsHandle {
  /** Fresh stats for the popup: products found, products with a rating. */
  stats(): Promise<PageStats>;
  /** Fresh per-item view of what was read and rated, for the debug report. */
  inspect(): Promise<PageInspection>;
}

const isVisible = (rating: ItemRating): boolean =>
  rating.status === "ambiguous" || (rating.status === "matched" && rating.ratings.length > 0);

interface TileRating {
  target: Target;
  rating: ItemRating;
  gpu: GpuMatchRating | null;
}

/** The CPU rating a chip can show: matched with at least one number, or ambiguous. */
const visibleCpu = (rating: ItemRating) =>
  rating.status !== "no_match" && isVisible(rating) ? rating : null;

function collectTargets(adapter: PageAdapter): Target[] {
  const kind = adapter.detect(location.href);
  if (kind === "listing") {
    const formFactor = listingFormFactor(location.href, document);
    return adapter.listingItems(document).map((item) => ({
      element: item.element,
      placement: "corner",
      query: { title: item.title, text: item.text, priceEur: item.priceEur, formFactor },
      seen: {
        adapterId: item.adapterId,
        productId: item.productId ?? null,
        textSource: item.textSource,
        title: item.title,
        text: item.text,
      },
    }));
  }
  if (kind === "product") {
    const info = adapter.productInfo(document);
    if (info?.element) {
      return [
        {
          element: info.element,
          placement: "inline",
          query: {
            title: info.title,
            text: info.specText,
            priceEur: info.priceEur,
            formFactor: productFormFactor(info),
          },
          seen: {
            adapterId: info.adapterId,
            productId: null,
            textSource: "dom",
            title: info.title,
            text: info.specText,
          },
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
  let inspection: PageInspection = { kind: stats.kind, items: [] };

  const buildView = async (): Promise<View> => {
    const [snapshot, gpuSnapshot, settings, cohortPolicy] = await Promise.all([
      loadCpuSnapshot(),
      loadGpuSnapshot(),
      loadSettings(),
      loadCohortPolicy(),
    ]);
    return {
      engine:
        snapshot === null
          ? null
          : createRatingEngine(
              snapshot,
              resolveEnabledStrategyIds(settings?.enabledStrategyIds),
              cohortPolicy,
            ),
      gpuEngine: gpuSnapshot === null ? null : createGpuEngine(gpuSnapshot, cohortPolicy),
      primaryId: settings?.primaryStrategyId ?? DEFAULT_PRIMARY_ID,
      importedAt: snapshot?.importedAt ?? gpuSnapshot?.importedAt ?? null,
    };
  };

  const drop = (element: Element, entry: ChipEntry, overlay: Overlay): void => {
    chips.delete(element);
    entry.gone = true;
    overlay.clear(entry.id);
    entry.host?.remove();
    entry.restorePosition();
  };

  const sync = (overlay: Overlay, current: View, results: readonly TileRating[]): void => {
    const live = new Set<Element>();
    for (const { target, rating, gpu } of results) {
      const cpu = visibleCpu(rating);
      if (cpu === null && gpu === null) continue;
      const { element } = target;
      live.add(element);
      const node = (
        <RatingChip
          rating={cpu}
          gpu={gpu}
          primaryId={current.primaryId}
          importedAt={current.importedAt}
          onOpenSettings={() => void sendMessage("openOptions", undefined)}
        />
      );
      const signature = `${current.primaryId}|${current.importedAt}|${signatureOf(rating, gpu)}`;
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
    }
    for (const [element, entry] of chips) if (!live.has(element)) drop(element, entry, overlay);
  };

  const scan = async (): Promise<void> => {
    const targets = collectTargets(adapter);
    let results: TileRating[] = [];
    let current: View | undefined;
    if (targets.length > 0) {
      view ??= buildView();
      current = await view;
      const queries = targets.map((t) => t.query);
      const ratings = current.engine?.rate(queries) ?? [];
      const gpus = current.gpuEngine?.rate(queries) ?? [];
      results = targets.map((target, i) => ({
        target,
        rating: ratings[i] ?? { status: "no_match" },
        gpu: gpus[i] ?? null,
      }));
    }
    const isRated = ({ rating, gpu }: TileRating): boolean =>
      (rating.status === "matched" && isVisible(rating)) || gpu !== null;
    const kind = adapter.detect(location.href);
    stats = { kind, total: targets.length, rated: results.filter(isRated).length };
    inspection = {
      kind,
      items: results.map((result) => ({ ...result.target.seen, rated: isRated(result) })),
    };
    if (results.some(({ rating, gpu }) => isVisible(rating) || gpu !== null) && current) {
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
    } catch (error) {
      await recordError("content", error);
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
  const unwatch = [
    cpuSnapshotItem.watch(invalidate),
    gpuSnapshotItem.watch(invalidate),
    settingsItem.watch(invalidate),
    cohortPolicyItem.watch(invalidate),
  ];

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
    async inspect() {
      await scan();
      return inspection;
    },
  };
}
