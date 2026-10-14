import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { HOST_TAG_PREFIX, ROOT_STYLES, tokenCss } from "../../../ui/theme";
import { CHIP_STYLES } from "../view/chip-styles";

export type ChipPlacement = "corner" | "inline";

export interface ChipHost {
  host: HTMLElement;
  /** Mount point inside the host's shadow root; the overlay's React root portals the chip here. */
  container: HTMLElement;
  remove(): void;
}

/** Where the chip sits: top-left of the tile's image area (absolute, no layout shift), or inline. */
const hostCss = (placement: ChipPlacement): string =>
  placement === "corner"
    ? ":host{all:initial;position:absolute;top:8px;left:8px;z-index:2;display:block;font-family:inherit;}"
    : ":host{all:initial;display:inline-block;margin-left:8px;vertical-align:middle;font-family:inherit;}";

const chipHostStyles = (placement: ChipPlacement): string =>
  `${tokenCss(":host")}${hostCss(placement)}${ROOT_STYLES}${CHIP_STYLES}`;

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
    name: `${HOST_TAG_PREFIX}badge`,
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
