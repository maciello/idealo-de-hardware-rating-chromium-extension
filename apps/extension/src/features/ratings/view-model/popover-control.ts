import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";

/** What the chip's popover needs from its controller: open state and the handlers that change it. */
export interface PopoverControl {
  opened: boolean;
  setOpened(next: boolean): void;
  /** Handlers of the chip button the card hangs off. */
  target: {
    onPointerEnter(): void;
    onPointerLeave(): void;
    onFocus(event: FocusEvent<HTMLButtonElement>): void;
    onBlur(): void;
    onKeyDown(event: KeyboardEvent): void;
    onClick(event: MouseEvent<HTMLButtonElement>): void;
  };
  /** Handlers of the card itself: hovering or focusing it keeps it open. */
  dropdown: {
    onPointerEnter(): void;
    onPointerLeave(): void;
    onFocus(): void;
    onBlur(): void;
  };
}
