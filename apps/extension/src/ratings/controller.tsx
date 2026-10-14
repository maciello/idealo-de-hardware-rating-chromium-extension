import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type { PageAdapter } from "../page/adapter";
import { cpuSnapshotItem, loadCpuSnapshot, settingsItem } from "../storage/items";
import { type MountedReactUi, mountReact } from "../ui/mount";
import { RatingBadge } from "./Badge";
import {
  createRatingEngine,
  type ItemRating,
  type RatingEngine,
  type RatingQuery,
  resolveEnabledStrategyIds,
  STRATEGY_CATALOG,
} from "./engine";

const BADGE_TAG = "idealo-hw-badge";
const DEBOUNCE_MS = 250;
const LABELS: ReadonlyMap<string, string> = new Map(STRATEGY_CATALOG.map((s) => [s.id, s.label]));

interface Target {
  element: Element;
  query: RatingQuery;
}

interface BadgeEntry {
  signature: string;
  ui: Promise<MountedReactUi>;
  host?: HTMLElement;
}

const isVisible = (rating: ItemRating): boolean =>
  rating.status === "ambiguous" || (rating.status === "matched" && rating.ratings.length > 0);

const signatureOf = (rating: ItemRating): string => {
  if (rating.status === "matched") {
    return `m:${rating.record.id}:${rating.ratings.map((r) => r.display).join(",")}`;
  }
  return rating.status === "ambiguous" ? `a:${rating.candidates.map((c) => c.id).join(",")}` : "n";
};

function collectTargets(adapter: PageAdapter): Target[] {
  const kind = adapter.detect(location.href);
  if (kind === "listing") {
    return adapter.listingItems(document).map((item) => ({
      element: item.element,
      query: { title: item.title, text: item.text, priceEur: item.priceEur },
    }));
  }
  if (kind === "product") {
    const info = adapter.productInfo(document);
    if (info?.element) {
      return [
        {
          element: info.element,
          query: { title: info.title, text: info.specText, priceEur: info.priceEur },
        },
      ];
    }
  }
  return [];
}

const isOwnMutation = (mutation: MutationRecord): boolean =>
  [...mutation.addedNodes, ...mutation.removedNodes].every(
    (node) => node instanceof Element && node.localName.startsWith("idealo-hw-"),
  );

/** Keeps exactly one badge per rated element, in sync with the DOM and the user's settings. */
export function startRatings(ctx: ContentScriptContext, adapter: PageAdapter): void {
  const badges = new Map<Element, BadgeEntry>();
  let engine: Promise<RatingEngine | null> | undefined;
  let running = false;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const buildEngine = async (): Promise<RatingEngine | null> => {
    const snapshot = await loadCpuSnapshot();
    if (snapshot === null) return null;
    const settings = await settingsItem.getValue();
    return createRatingEngine(snapshot, resolveEnabledStrategyIds(settings?.enabledStrategyIds));
  };

  const drop = (element: Element, entry: BadgeEntry): void => {
    badges.delete(element);
    void entry.ui.then((ui) => ui.remove());
  };

  const sync = (results: readonly { element: Element; rating: ItemRating }[]): void => {
    const live = new Set<Element>();
    for (const { element, rating } of results) {
      if (!isVisible(rating)) continue;
      live.add(element);
      const node = <RatingBadge rating={rating} labels={LABELS} />;
      const signature = signatureOf(rating);
      const existing = badges.get(element);
      if (existing && (existing.host === undefined || element.contains(existing.host))) {
        if (existing.signature !== signature) {
          existing.signature = signature;
          void existing.ui.then((ui) => ui.update(node));
        }
        continue;
      }
      if (existing) drop(element, existing);
      const entry: BadgeEntry = {
        signature,
        ui: mountReact(ctx, { name: BADGE_TAG, anchor: element, append: "first", node }),
      };
      void entry.ui.then((ui) => {
        entry.host = ui.host;
      });
      badges.set(element, entry);
    }
    for (const [element, entry] of badges) if (!live.has(element)) drop(element, entry);
  };

  const scan = async (): Promise<void> => {
    const targets = collectTargets(adapter);
    let ratings: ItemRating[] = [];
    if (targets.length > 0) {
      engine ??= buildEngine();
      ratings = (await engine)?.rate(targets.map((t) => t.query)) ?? [];
    }
    sync(
      targets.flatMap((t, i) => (ratings[i] ? [{ element: t.element, rating: ratings[i] }] : [])),
    );
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
    engine = undefined;
    schedule(0);
  };
  const unwatch = [cpuSnapshotItem.watch(invalidate), settingsItem.watch(invalidate)];

  ctx.onInvalidated(() => {
    observer.disconnect();
    clearTimeout(timer);
    for (const stop of unwatch) stop();
  });
  schedule(0);
}
