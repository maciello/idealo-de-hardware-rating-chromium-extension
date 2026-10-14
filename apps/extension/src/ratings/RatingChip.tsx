import { Popover } from "@mantine/core";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import type { ItemRating } from "./engine";
import { type CardRow, cardRows, chipModel, formatImportDate } from "./present";

const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 150;
const CARD_WIDTH = 300;

type Matched = Extract<ItemRating, { status: "matched" }>;
type Ambiguous = Extract<ItemRating, { status: "ambiguous" }>;

export function Meter({ filled, label }: { filled: number; label?: string }) {
  return (
    <span
      className="hw-meter"
      data-filled={filled}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} {...(i < filled ? { "data-on": "" } : {})} />
      ))}
    </span>
  );
}

function Row({ row }: { row: CardRow }) {
  return (
    <div title={row.title} data-testid={`card-row-${row.id}`}>
      <div className="hw-row__main">
        <span className="hw-row__label">{row.label}</span>
        <span className="hw-row__value">{row.value}</span>
      </div>
      {row.meter && (
        <div className="hw-row__context">
          <Meter filled={row.meter.filled} />
          <span>{row.meter.text}</span>
        </div>
      )}
    </div>
  );
}

function CardBody({
  rating,
  importedAt,
  onOpenSettings,
}: {
  rating: Matched | Ambiguous;
  importedAt: string | null;
  onOpenSettings: () => void;
}) {
  const imported = formatImportDate(importedAt);
  const footer = (
    <div className="hw-card__foot">
      <span>{imported ? `PassMark import ${imported}` : "PassMark import"}</span>
      <button type="button" className="hw-link" onClick={onOpenSettings}>
        Settings
      </button>
    </div>
  );
  if (rating.status === "ambiguous") {
    return (
      <div className="hw-card" data-testid="rating-card">
        <div className="hw-card__head">
          <div className="hw-card__title">Several PassMark CPUs match</div>
          <div className="hw-card__sub">The title does not say which one it is.</div>
        </div>
        <ul className="hw-card__list">
          {rating.candidates.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
        {footer}
      </div>
    );
  }
  return (
    <div className="hw-card" data-testid="rating-card">
      <div className="hw-card__head">
        <div className="hw-card__title">{rating.record.name}</div>
        <div className="hw-card__sub">Matched to PassMark entry</div>
      </div>
      <div className="hw-card__rows">
        {cardRows(rating).map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </div>
      {footer}
    </div>
  );
}

export interface RatingChipProps {
  rating: Matched | Ambiguous;
  primaryId: string;
  importedAt: string | null;
  onOpenSettings: () => void;
}

/**
 * Collapsed chip in the tile; the card is a Popover dropdown that Mantine portals into the overlay.
 * HoverCard is not used because it cannot be controlled: after Escape, Enter must reopen the card.
 */
export function RatingChip({ rating, primaryId, importedAt, onOpenSettings }: RatingChipProps) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const settle = (next: boolean, delay: number): void => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpened(next), delay);
  };
  const cancel = (): void => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const model = rating.status === "matched" ? chipModel(rating, primaryId) : null;
  if (rating.status === "matched" && model === null) return null;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !opened) return;
    event.stopPropagation();
    cancel();
    setOpened(false);
  };
  const onClick = (event: MouseEvent<HTMLButtonElement>): void => {
    // Tiles are often one big link: the chip must never navigate.
    event.preventDefault();
    event.stopPropagation();
    cancel();
    // detail is 0 for Enter/Space: those open (and keep open), a mouse click toggles.
    setOpened(event.detail === 0 ? true : !opened);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={CARD_WIDTH}
      position="bottom-start"
      offset={6}
      withinPortal
      closeOnClickOutside
      closeOnEscape
      transitionProps={{ duration: 100 }}
      classNames={{ dropdown: "hw-popover" }}
    >
      <Popover.Target>
        <button
          type="button"
          className="hw-chip"
          data-testid="rating-badge"
          data-status={rating.status}
          aria-label={model?.aria ?? "CPU: several PassMark matches. Show details"}
          onPointerEnter={() => settle(true, OPEN_DELAY_MS)}
          onPointerLeave={() => settle(false, CLOSE_DELAY_MS)}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              cancel();
              setOpened(true);
            }
          }}
          onBlur={() => settle(false, CLOSE_DELAY_MS)}
          onKeyDown={onKeyDown}
          onClick={onClick}
        >
          {model ? (
            <>
              {model.filled !== null && <Meter filled={model.filled} />}
              <span className="hw-chip__value" data-testid="chip-value">
                {model.value}
              </span>
              <span className="hw-chip__label">{model.label}</span>
            </>
          ) : (
            <span className="hw-chip__value">CPU ?</span>
          )}
        </button>
      </Popover.Target>
      <Popover.Dropdown
        onPointerEnter={cancel}
        onPointerLeave={() => settle(false, CLOSE_DELAY_MS)}
        onFocus={cancel}
        onBlur={() => settle(false, CLOSE_DELAY_MS)}
        data-testid="rating-card-host"
      >
        <CardBody rating={rating} importedAt={importedAt} onOpenSettings={onOpenSettings} />
      </Popover.Dropdown>
    </Popover>
  );
}
