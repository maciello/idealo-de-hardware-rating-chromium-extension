/** The chip button and its lines; lives in each tile's own shadow root. */
export const CHIP_STYLES = `
  .hw-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    min-height: 24px;
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
  .hw-chip__line { display: inline-flex; align-items: center; gap: 6px; height: 22px; }
  .hw-chip:hover, .hw-chip[aria-expanded="true"] { box-shadow: var(--hw-shadow); }
  .hw-chip:focus-visible { outline: 2px solid var(--hw-focus); outline-offset: 1px; }
  .hw-chip__value { font-weight: 600; }
  .hw-chip__label { color: var(--hw-ink-muted); }
  .hw-chip__tag { padding: 1px 4px; border-radius: 3px; background: var(--hw-warn-weak); color: var(--hw-warn); font-size: var(--hw-font-s); font-weight: 600; line-height: 1.1; }

  .hw-chip__flags { display: inline-flex; align-items: center; gap: 2px; flex: none; padding: 1px 4px; border-radius: 3px; font-weight: 600; line-height: 1.1; }
  .hw-chip__flags svg { display: block; width: 12px; height: 12px; }
  .hw-chip__flags[data-severity="red"] { background: var(--hw-danger-weak); color: var(--hw-danger); }
  .hw-chip__flags[data-severity="amber"] { background: var(--hw-warn-weak); color: var(--hw-warn); }

  .hw-chip__power { display: inline-flex; align-items: center; flex: none; color: var(--hw-ink-muted); }
  .hw-chip__power svg { display: block; width: 14px; height: 14px; }
  .hw-chip__power[data-level="low"] { color: var(--hw-accent); }
  .hw-chip__power[data-level="high"] { color: var(--hw-warn); }
`;
