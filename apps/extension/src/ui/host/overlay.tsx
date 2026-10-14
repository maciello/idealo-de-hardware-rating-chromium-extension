import { MantineProvider } from "@mantine/core";
import { Fragment, type ReactNode, useMemo, useSyncExternalStore } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { createHwTheme, HOST_TAG_PREFIX, overlayHostStyles, Z_INDEX } from "../theme";
import { mantineSheet } from "./mantine-sheet";
import { createOverlayStore, type OverlayStore } from "./overlay-store";

function EntriesView({ store }: { store: OverlayStore }) {
  const entries = useSyncExternalStore(store.subscribe, store.snapshot);
  return (
    <>
      {entries.map((entry) =>
        entry.into ? (
          createPortal(entry.node, entry.into, entry.id)
        ) : (
          <Fragment key={entry.id}>{entry.node}</Fragment>
        ),
      )}
    </>
  );
}

function OverlayMantine({
  host,
  container,
  children,
}: {
  host: HTMLElement;
  container: HTMLElement;
  children: ReactNode;
}) {
  // Mantine portals default to document.body, outside the shadow root and unstyled: point every
  // floating component at the overlay container, and keep it fixed so scrolling cannot detach it.
  const theme = useMemo(() => {
    const portalProps = { target: container };
    return createHwTheme("inherit", {
      Popover: {
        defaultProps: {
          portalProps,
          zIndex: Z_INDEX,
          floatingStrategy: "fixed",
        },
      },
      Tooltip: { defaultProps: { portalProps, zIndex: Z_INDEX } },
      Drawer: { defaultProps: { portalProps, zIndex: Z_INDEX, lockScroll: false } },
    });
  }, [container]);
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="light"
      getRootElement={() => host}
      // Not ":host": scheme-specific variables are emitted as `<selector>[data-mantine-color-scheme]`,
      // which is invalid for :host. The container carries both the class and the attribute.
      cssVariablesSelector=".hw-root"
    >
      {children}
    </MantineProvider>
  );
}

export interface Overlay {
  readonly host: HTMLElement;
  /** Portal target for floating UI (Mantine popover dropdowns, drawer). */
  readonly container: HTMLElement;
  /** Adds or replaces `id`. With `into`, the node is rendered into that element via a portal. */
  render(id: string, node: ReactNode, into?: HTMLElement): void;
  /** Synchronously unmounts `id`, so its container can be removed right after. */
  clear(id: string): void;
}

/**
 * The single layer all floating UI lives in. idealo's tiles each create a stacking context, so a
 * dropdown rendered inside a tile is painted under the following tiles whatever its z-index. The
 * overlay is a direct child of <html>, position fixed, click-through, with its own shadow root.
 * One React root renders everything: chips are portaled into their tile hosts, so anchor and
 * dropdown share one provider and one open-state, while the dropdown lands in this layer.
 * `options.css` is the stylesheet of the features that render into it (the rating card).
 */
export async function mountOverlay(
  ctx: ContentScriptContext,
  options: { css?: string } = {},
): Promise<Overlay> {
  const store = createOverlayStore();
  let root: Root | undefined;
  let hostElement: HTMLElement | undefined;
  let containerElement: HTMLElement | undefined;

  const ui = await createShadowRootUi(ctx, {
    name: `${HOST_TAG_PREFIX}overlay`,
    position: "inline",
    anchor: document.documentElement,
    append: "last",
    inheritStyles: true,
    isolateEvents: true,
    css: overlayHostStyles(options.css),
    onMount(container, shadow, host) {
      if (mantineSheet) shadow.adoptedStyleSheets = [mantineSheet];
      hostElement = host;
      containerElement = container;
      // The page's font, as seen by its content (html itself often has no font set).
      host.style.fontFamily = getComputedStyle(document.body).fontFamily;
      container.className = "hw-root";
      // Mantine styles use `[data-mantine-color-scheme] .x` descendant selectors, which cannot
      // match across the shadow boundary from the attribute MantineProvider sets on the host.
      container.setAttribute("data-mantine-color-scheme", "light");
      root = createRoot(container);
      root.render(
        <OverlayMantine host={host} container={container}>
          <EntriesView store={store} />
        </OverlayMantine>,
      );
    },
    onRemove() {
      root?.unmount();
      root = undefined;
    },
  });
  ui.mount();

  if (!hostElement || !containerElement) throw new Error("Overlay failed to mount");
  return {
    host: hostElement,
    container: containerElement,
    render: (id, node, into) => store.set({ id, node, into }),
    clear: (id) => flushSync(() => store.remove(id)),
  };
}
