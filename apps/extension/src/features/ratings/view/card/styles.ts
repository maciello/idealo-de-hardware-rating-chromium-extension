/** The card body; lives in the overlay, where Mantine portals the popover dropdown. */
export const CARD_STYLES = `
  .hw-card { display: block; width: 100%; color: var(--hw-ink); font-size: var(--hw-font-m); }
  .hw-card__head { padding: var(--hw-space-12) var(--hw-space-14) var(--hw-space-10); }
  .hw-card__title { font-size: var(--hw-font-l); font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
  .hw-card__sub { margin-top: var(--hw-space-2); font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-card__rows { margin: 0; padding: var(--hw-space-10) var(--hw-space-14); border-top: 1px solid var(--hw-line); border-bottom: 1px solid var(--hw-line); display: grid; gap: var(--hw-space-8); }
  .hw-row__main { display: flex; justify-content: space-between; gap: var(--hw-space-12); }
  .hw-row__label { color: var(--hw-ink-muted); }
  .hw-row__value { font-weight: 600; text-align: right; }
  .hw-row__context { display: flex; align-items: center; gap: var(--hw-space-6); margin-top: var(--hw-space-3); font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-card__list { margin: 0; padding: var(--hw-space-10) var(--hw-space-14); border-top: 1px solid var(--hw-line); display: grid; gap: var(--hw-space-4); list-style: none; border-bottom: 1px solid var(--hw-line); }
  .hw-flags { list-style: none; }
  .hw-flag__main { display: flex; align-items: center; gap: var(--hw-space-6); }
  .hw-flag__label { font-weight: 600; }
  .hw-flag__severity { padding: 1px var(--hw-space-4); border-radius: var(--hw-radius-xs); font-size: var(--hw-font-s); font-weight: 600; line-height: 1.1; background: var(--hw-surface-muted); color: var(--hw-ink-muted); }
  .hw-flags [data-severity="red"] .hw-flag__severity { background: var(--hw-danger-weak); color: var(--hw-danger); }
  .hw-flags [data-severity="amber"] .hw-flag__severity { background: var(--hw-warn-weak); color: var(--hw-warn); }
  .hw-flag__detail { margin-top: var(--hw-space-2); font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-card__features { display: flex; align-items: baseline; gap: var(--hw-space-8); padding: var(--hw-space-8) var(--hw-space-14); border-top: 1px solid var(--hw-line); }
  .hw-card__features-title { flex: none; font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-features { margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--hw-space-4); list-style: none; }
  .hw-features li { padding: 1px var(--hw-space-6); border-radius: var(--hw-radius-xs); background: var(--hw-accent-weak); color: var(--hw-ink); font-size: var(--hw-font-s); font-weight: 600; }
  .hw-card__foot { display: flex; align-items: center; justify-content: space-between; gap: var(--hw-space-8); padding: var(--hw-space-8) var(--hw-space-14); font-size: var(--hw-font-s); color: var(--hw-ink-muted); }
  .hw-link { all: unset; box-sizing: border-box; cursor: pointer; color: var(--hw-accent); font-size: var(--hw-font-s); font-weight: 600; border-radius: var(--hw-radius-xs); padding: var(--hw-space-2) var(--hw-space-4); }
  .hw-link:hover { text-decoration: underline; }
  .hw-link:focus-visible { outline: 2px solid var(--hw-focus); outline-offset: 1px; }
`;
