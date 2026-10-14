import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { chipHostStyles } from "./styles";

export type ChipPlacement = "corner" | "inline";

export interface ChipHost {
  host: HTMLElement;
  /** Mount point inside the host's shadow root; the overlay's React root portals the chip here. */
  container: HTMLElement;
  remove(): void;
}

/**
 * A tiny shadow host that anchors a chip. "corner" is absolutely positioned at the top-left of
 * the tile, so it takes no space and cannot shift idealo's layout; "inline" flows after a heading.
 * It holds no React root and no floating content: both live in the overlay.
 */
export async function mountChipHost(
  ctx: ContentScriptContext,
  anchor: Element,
  placement: ChipPlacement,
): Promise<ChipHost> {
  let container: HTMLElement | undefined;
  const ui = await createShadowRootUi(ctx, {
    name: "idealo-hw-badge",
    position: "inline",
    anchor,
    append: placement === "corner" ? "first" : "last",
    inheritStyles: true,
    css: chipHostStyles(placement),
    onMount(uiContainer) {
      container = uiContainer;
      uiContainer.className = "hw-root";
    },
  });
  ui.mount();
  if (!container) throw new Error("Chip host failed to mount");
  return { host: ui.shadowHost, container, remove: () => ui.remove() };
}
