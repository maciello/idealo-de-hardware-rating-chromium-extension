import { useEffect, useRef, useState } from "react";
import { CLOSE_DELAY_MS, OPEN_DELAY_MS } from "../config";
import type { PopoverControl } from "../view-model";

/**
 * Open state of the chip's card: hover opens after a short delay, leaving closes after a longer
 * one, keyboard focus opens at once. Escape closes; Enter or Space reopen (a mouse click toggles).
 */
export function useHoverPopover(): PopoverControl {
  const [opened, setOpened] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const cancel = (): void => window.clearTimeout(timer.current);
  const settle = (next: boolean, delay: number): void => {
    cancel();
    timer.current = window.setTimeout(() => setOpened(next), delay);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const scheduleClose = (): void => settle(false, CLOSE_DELAY_MS);

  return {
    opened,
    setOpened,
    target: {
      onPointerEnter: () => settle(true, OPEN_DELAY_MS),
      onPointerLeave: scheduleClose,
      onFocus(event) {
        if (event.currentTarget.matches(":focus-visible")) {
          cancel();
          setOpened(true);
        }
      },
      onBlur: scheduleClose,
      onKeyDown(event) {
        if (event.key !== "Escape" || !opened) return;
        event.stopPropagation();
        cancel();
        setOpened(false);
      },
      onClick(event) {
        // Tiles are often one big link: the chip must never navigate.
        event.preventDefault();
        event.stopPropagation();
        cancel();
        // detail is 0 for Enter/Space: those open (and keep open), a mouse click toggles.
        setOpened(event.detail === 0 ? true : !opened);
      },
    },
    dropdown: {
      onPointerEnter: cancel,
      onPointerLeave: scheduleClose,
      onFocus: cancel,
      onBlur: scheduleClose,
    },
  };
}
