import { RATINGS_COPY } from "../copy";
import type { CardView } from "../view-model";
import { CardRow } from "./CardRow";
import { GpuCardSections } from "./gpu/GpuCardSections";

/** The card under a chip: the CPU block, the GPU blocks, and the import footnote with a settings link. */
export function RatingCard({
  card,
  onOpenSettings,
}: {
  card: CardView;
  onOpenSettings: () => void;
}) {
  const { cpu } = card;
  return (
    <div className="hw-card" data-testid="rating-card">
      {cpu && (
        <div className="hw-card__head">
          <div className="hw-card__title">{cpu.title}</div>
          <div className="hw-card__sub">{cpu.sub}</div>
        </div>
      )}
      {cpu?.kind === "ambiguous" && (
        <ul className="hw-card__list">
          {cpu.candidates.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      )}
      {cpu?.kind === "matched" && (
        <div className="hw-card__rows">
          {cpu.rows.map((row) => (
            <CardRow key={row.id} row={row} />
          ))}
        </div>
      )}
      <GpuCardSections sections={card.gpuSections} />
      <div className="hw-card__foot">
        <span>{card.footer}</span>
        <button type="button" className="hw-link" onClick={onOpenSettings}>
          {RATINGS_COPY.settings}
        </button>
      </div>
    </div>
  );
}
