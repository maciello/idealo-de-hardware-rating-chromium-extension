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

/** The meter, the chip and the card body: shared by chip hosts (meter, chip) and the overlay (card). */
const COMPONENTS = `
  *, *::before, *::after { box-sizing: border-box; }
  .hw-meter { display: inline-flex; gap: 2px; align-items: center; flex: none; }
  .hw-meter i { display: block; width: 4px; height: 10px; border-radius: 1px; background: var(--hw-accent-weak); }
  .hw-meter i[data-on] { background: var(--hw-accent); }

  .hw-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--hw-line);
    border-radius: var(--hw-radius-s);
    background: var(--hw-surface);
    color: var(--hw-ink);
    font-family: inherit;
    font-size: var(--hw-font-s);
    font-weight: 400;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: default;
  }
  .hw-chip:hover, .hw-chip[aria-expanded="true"] { box-shadow: var(--hw-shadow); }
  .hw-chip:focus-visible { outline: 2px solid var(--hw-focus); outline-offset: 1px; }
  .hw-chip__value { font-weight: 600; }
  .hw-chip__label { color: var(--hw-ink-muted); }
  .hw-chip__tag { padding: 1px 4px; border-radius: 3px; background: var(--hw-warn-weak); color: var(--hw-warn); font-size: var(--hw-font-s); font-weight: 600; line-height: 1.1; }

  .hw-chip__power { display: inline-flex; align-items: center; flex: none; color: var(--hw-ink-muted); }
  .hw-chip__power svg { display: block; width: 14px; height: 14px; }
  .hw-chip__power[data-level="low"] { color: var(--hw-accent); }
  .hw-chip__power[data-level="high"] { color: var(--hw-warn); }

  .hw-card { display: block; width: 100%; color: var(--hw-ink); font-size: var(--hw-font-m); }
  .hw-card__head { padding: 12px 14px 10px; }
  .hw-card__title { font-size: var(--hw-font-l); font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
  .hw-card__sub { margin-top: 2px; font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-card__rows { margin: 0; padding: 10px 14px; border-top: 1px solid var(--hw-line); border-bottom: 1px solid var(--hw-line); display: grid; gap: 8px; }
  .hw-row__main { display: flex; justify-content: space-between; gap: 12px; }
  .hw-row__label { color: var(--hw-ink-muted); }
  .hw-row__value { font-weight: 600; text-align: right; }
  .hw-row__context { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-card__list { margin: 0; padding: 10px 14px; border-top: 1px solid var(--hw-line); display: grid; gap: 4px; list-style: none; border-bottom: 1px solid var(--hw-line); }
  .hw-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-link { all: unset; box-sizing: border-box; cursor: pointer; color: var(--hw-accent); font-size: var(--hw-font-s); font-weight: 600; border-radius: 3px; padding: 2px 4px; }
  .hw-link:hover { text-decoration: underline; }
  .hw-link:focus-visible { outline: 2px solid var(--hw-focus); outline-offset: 1px; }
`;

/** Where the chip sits: top-left of the tile's image area (absolute, no layout shift), or inline. */
const hostCss = (placement: "corner" | "inline"): string =>
  placement === "corner"
    ? ":host{all:initial;position:absolute;top:8px;left:8px;z-index:2;display:block;font-family:inherit;}"
    : ":host{all:initial;display:inline-block;margin-left:8px;vertical-align:middle;font-family:inherit;}";

export const chipHostStyles = (placement: "corner" | "inline"): string =>
  `${tokenCss(":host")}${hostCss(placement)}.hw-root{${BASE}}${COMPONENTS}`;

/**
 * One fixed, click-through layer holding all floating UI. Children opt back in to pointer events:
 * Mantine's popover dropdowns and drawer root, and anything marked data-hw-interactive.
 */
export const OVERLAY_HOST_STYLES = `${tokenCss(":host")}
  :host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block;font-family:inherit;background:transparent!important;}
  .hw-root{${BASE}}
  ${COMPONENTS}
  .mantine-Popover-dropdown, .mantine-Drawer-root, [data-hw-interactive] { pointer-events: auto; }
  .mantine-Popover-dropdown.hw-popover { padding: 0; border: 1px solid var(--hw-line); border-radius: var(--hw-radius-m); background: var(--hw-surface); box-shadow: var(--hw-shadow-card); }
`;
