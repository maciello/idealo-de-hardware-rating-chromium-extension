import { OVERLAY_HOST_Z_INDEX } from "./layers";
import { tokenCss } from "./tokens";

/** Typographic baseline for our shadow content: the page's font, our sizes. */
const BASE = `
  font-family: inherit;
  font-size: var(--hw-font-m);
  font-weight: 400;
  line-height: 1.35;
  color: var(--hw-ink);
  font-variant-numeric: tabular-nums;
  text-transform: none;
  letter-spacing: normal;
  text-align: left;
  white-space: normal;
`;

/** The root class every shadow container carries, plus the meter that chips and cards share. */
export const ROOT_STYLES = `
  .hw-root{${BASE}}
  *, *::before, *::after { box-sizing: border-box; }
  .hw-meter { display: inline-flex; gap: 2px; align-items: center; flex: none; }
  .hw-meter i { display: block; width: 4px; height: 10px; border-radius: 1px; background: var(--hw-accent-weak); }
  .hw-meter i[data-on] { background: var(--hw-accent); }
`;

/**
 * One fixed, click-through layer holding all floating UI. Children opt back in to pointer events:
 * Mantine's popover dropdowns and drawer root, and anything marked data-hw-interactive.
 * `featureCss` carries the styles of whatever the features render into the overlay.
 */
export const overlayHostStyles = (featureCss = ""): string => `${tokenCss(":host")}
  :host{all:initial;position:fixed;inset:0;z-index:${OVERLAY_HOST_Z_INDEX};pointer-events:none;display:block;font-family:inherit;background:transparent!important;}
  ${ROOT_STYLES}
  ${featureCss}
  .mantine-Popover-dropdown, .mantine-Drawer-root, [data-hw-interactive] { pointer-events: auto; }
  .mantine-Popover-dropdown.hw-popover { padding: 0; border: 1px solid var(--hw-line); border-radius: var(--hw-radius-m); background: var(--hw-surface); box-shadow: var(--hw-shadow-card); }
`;
