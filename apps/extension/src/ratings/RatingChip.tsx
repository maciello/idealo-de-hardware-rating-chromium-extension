import type { GpuMatchRating } from "@idealo-hw/hw-bench";
import { Popover } from "@mantine/core";
import { IconFlame, IconLeaf } from "@tabler/icons-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { formatImportDate, Meter } from "../ui";
import type { ItemRating } from "./engine";
import {
  AMBIGUOUS_CPU_ARIA,
  type CardRow,
  cardRows,
  chipAria,
  chipModel,
  OLD_MEMORY_HINT,
} from "./present";
import { gpuCardHead, gpuCardRows, gpuLineModel } from "./present-gpu";

const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 150;
const CARD_WIDTH = 300;

type Matched = Extract<ItemRating, { status: "matched" }>;
type Ambiguous = Extract<ItemRating, { status: "ambiguous" }>;

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
  gpu,
  importedAt,
  onOpenSettings,
}: {
  rating: Matched | Ambiguous | null;
  gpu: GpuMatchRating | null;
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
  const gpuHead = gpu ? gpuCardHead(gpu) : null;
  const gpuSection = gpu && gpuHead && (
    <div data-testid="card-gpu">
      <div className="hw-card__head">
        <div className="hw-card__title">{gpuHead.title}</div>
        <div className="hw-card__sub">{gpuHead.sub}</div>
      </div>
      <div className="hw-card__rows">
        {gpuCardRows(gpu).map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
  if (rating === null) {
    return (
      <div className="hw-card" data-testid="rating-card">
        {gpuSection}
        {footer}
      </div>
    );
  }
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
        {gpuSection}
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
      {gpuSection}
      {footer}
    </div>
  );
}

export interface RatingChipProps {
  /** Null when only the GPU was recognised: the chip then shows the GPU line alone. */
  rating: Matched | Ambiguous | null;
  gpu?: GpuMatchRating | null | undefined;
  primaryId: string;
  importedAt: string | null;
  onOpenSettings: () => void;
}

/**
 * Collapsed chip in the tile; the card is a Popover dropdown that Mantine portals into the overlay.
 * HoverCard is not used because it cannot be controlled: after Escape, Enter must reopen the card.
 */
export function RatingChip({
  rating,
  gpu = null,
  primaryId,
  importedAt,
  onOpenSettings,
}: RatingChipProps) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const settle = (next: boolean, delay: number): void => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpened(next), delay);
  };
  const cancel = (): void => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const model = rating?.status === "matched" ? chipModel(rating, primaryId) : null;
  const gpuModel = gpu ? gpuLineModel(gpu) : null;
  const cpu = rating !== null && (rating.status === "ambiguous" || model !== null) ? rating : null;
  if (cpu === null && gpuModel === null) return null;
  const aria = chipAria([
    ...(cpu ? [model?.aria ?? AMBIGUOUS_CPU_ARIA] : []),
    ...(gpuModel ? [gpuModel.aria] : []),
  ]);

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
          data-status={cpu?.status ?? "gpu"}
          aria-label={aria}
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
          {cpu && (
            <span className="hw-chip__line" data-testid="chip-cpu">
              {model ? (
                <>
                  {model.filled !== null && <Meter filled={model.filled} />}
                  <span className="hw-chip__value" data-testid="chip-value">
                    {model.value}
                  </span>
                  <span className="hw-chip__label">{model.label}</span>
                  {model.power !== null && (
                    <span
                      className="hw-chip__power"
                      data-level={model.power.level}
                      role="img"
                      aria-label={model.power.label}
                      title={model.power.label}
                      data-testid="chip-power"
                    >
                      {model.power.level === "low" ? (
                        <IconLeaf aria-hidden />
                      ) : (
                        <IconFlame aria-hidden />
                      )}
                    </span>
                  )}
                  {model.memoryWarning !== null && (
                    <span
                      className="hw-chip__tag"
                      title={OLD_MEMORY_HINT}
                      data-testid="chip-memory"
                    >
                      {model.memoryWarning}
                    </span>
                  )}
                </>
              ) : (
                <span className="hw-chip__value">CPU ?</span>
              )}
            </span>
          )}
          {gpuModel && (
            <span
              className="hw-chip__line"
              data-testid="chip-gpu"
              {...(gpuModel.context ? { title: gpuModel.context } : {})}
            >
              {gpuModel.filled !== null && (
                <Meter filled={gpuModel.filled} testId="chip-gpu-meter" />
              )}
              <span className="hw-chip__value" data-testid="chip-gpu-value">
                {gpuModel.value}
              </span>
              <span className="hw-chip__label">{gpuModel.label}</span>
            </span>
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
        <CardBody rating={cpu} gpu={gpu} importedAt={importedAt} onOpenSettings={onOpenSettings} />
      </Popover.Dropdown>
    </Popover>
  );
}
