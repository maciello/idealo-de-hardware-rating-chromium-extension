/** The chip button and its lines; lives in each tile's own shadow root. */
export const CHIP_STYLES = `
  .hw-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    min-height: var(--hw-chip-height);
    padding: 0 var(--hw-space-8);
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
  .hw-chip__line { display: inline-flex; align-items: center; gap: var(--hw-space-6); height: var(--hw-chip-line); }
  .hw-chip:hover, .hw-chip[aria-expanded="true"] { box-shadow: var(--hw-shadow); }
  .hw-chip:focus-visible { outline: 2px solid var(--hw-focus); outline-offset: 1px; }
  .hw-chip__value { font-weight: 600; }
  .hw-chip__label { color: var(--hw-ink-muted); }
  .hw-chip__tag { padding: 1px var(--hw-space-4); border-radius: var(--hw-radius-xs); background: var(--hw-warn-weak); color: var(--hw-warn); font-size: var(--hw-font-s); font-weight: 600; line-height: 1.1; }

  .hw-chip__flags { display: inline-flex; align-items: center; gap: var(--hw-space-2); flex: none; padding: 1px var(--hw-space-4); border-radius: var(--hw-radius-xs); font-weight: 600; line-height: 1.1; }
  .hw-chip__flags svg { display: block; width: var(--hw-icon-s); height: var(--hw-icon-s); }
  .hw-chip__flags[data-severity="red"] { background: var(--hw-danger-weak); color: var(--hw-danger); }
  .hw-chip__flags[data-severity="amber"] { background: var(--hw-warn-weak); color: var(--hw-warn); }

  .hw-chip__power { display: inline-flex; align-items: center; flex: none; color: var(--hw-ink-muted); }
  .hw-chip__power svg { display: block; width: var(--hw-icon-m); height: var(--hw-icon-m); }
  .hw-chip__power[data-level="low"] { color: var(--hw-accent); }
  .hw-chip__power[data-level="high"] { color: var(--hw-warn); }
`;
