import { createTheme, MantineProvider } from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?inline";
import { type ReactNode, useMemo } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";

const Z_INDEX = 2_147_483_000;

/** Parsed once, adopted by every shadow root (dozens of badges would otherwise each re-parse ~200 KB). */
const sharedSheet = ((): CSSStyleSheet | null => {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(mantineCss);
    return sheet;
  } catch {
    return null;
  }
})();

function ShadowMantine({
  host,
  container,
  children,
}: {
  host: HTMLElement;
  container: HTMLElement;
  children: ReactNode;
}) {
  // Mantine portals default to document.body, which is outside the shadow root and unstyled.
  const theme = useMemo(() => {
    const portalProps = { target: container };
    return createTheme({
      components: {
        Popover: { defaultProps: { portalProps, zIndex: Z_INDEX, floatingStrategy: "fixed" } },
        Tooltip: { defaultProps: { portalProps, zIndex: Z_INDEX } },
        Drawer: { defaultProps: { portalProps, zIndex: Z_INDEX, lockScroll: false } },
      },
    });
  }, [container]);
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="light"
      getRootElement={() => host}
      cssVariablesSelector=":host"
    >
      {children}
    </MantineProvider>
  );
}

export interface MountedReactUi {
  host: HTMLElement;
  update(node: ReactNode): void;
  remove(): void;
}

interface MountOptions {
  name: string;
  anchor: Element | string;
  append?: "first" | "last";
  isolateEvents?: boolean;
  node: ReactNode;
}

/** Mounts a React tree inside a WXT shadow-root UI that carries the Mantine stylesheet. */
export async function mountReact(
  ctx: ContentScriptContext,
  { name, anchor, append = "last", isolateEvents = false, node }: MountOptions,
): Promise<MountedReactUi> {
  let root: Root | undefined;
  let shadowHost: HTMLElement | undefined;
  let container: HTMLElement | undefined;
  const wrap = (content: ReactNode): ReactNode =>
    shadowHost && container ? (
      <ShadowMantine host={shadowHost} container={container}>
        {content}
      </ShadowMantine>
    ) : null;

  const ui = await createShadowRootUi(ctx, {
    name,
    position: "inline",
    anchor,
    append,
    isolateEvents,
    onMount(uiContainer, shadow, host) {
      if (sharedSheet) shadow.adoptedStyleSheets = [sharedSheet];
      shadowHost = host;
      container = uiContainer;
      // Mantine styles use `[data-mantine-color-scheme] .x` descendant selectors, which cannot match
      // across the shadow boundary from the attribute MantineProvider puts on the host.
      uiContainer.setAttribute("data-mantine-color-scheme", "light");
      // Portals render next to the app root, so base typography goes on the shared container.
      uiContainer.style.cssText =
        "font-family: var(--mantine-font-family); font-size: 14px; line-height: 1.4; color: var(--mantine-color-text);";
      root = createRoot(uiContainer);
      root.render(wrap(node));
    },
    onRemove() {
      root?.unmount();
      root = undefined;
    },
  });
  ui.mount();

  return {
    host: ui.shadowHost,
    update: (next) => root?.render(wrap(next)),
    remove: () => ui.remove(),
  };
}
