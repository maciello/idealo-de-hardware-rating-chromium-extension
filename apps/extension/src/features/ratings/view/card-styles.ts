/** The card body; lives in the overlay, where Mantine portals the popover dropdown. */
export const CARD_STYLES = `
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
