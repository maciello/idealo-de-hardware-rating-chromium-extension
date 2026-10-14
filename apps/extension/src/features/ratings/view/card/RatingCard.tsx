import { RATINGS_COPY } from "../../copy";
import type { CardView } from "../../view-model";
import { CardHead } from "./CardHead";
import { CardRow } from "./CardRow";
import { GpuCardSections } from "./GpuCardSections";
import { SignalsCardSections } from "./SignalsCardSections";

/** The card under a chip: the CPU block, the GPU blocks, the product's flags and features, and the import footnote with a settings link. */
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
      {cpu && <CardHead title={cpu.title} sub={cpu.sub} />}
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
      <SignalsCardSections signals={card.signals} />
      <div className="hw-card__foot">
        <span>{card.footer}</span>
        <button type="button" className="hw-link" onClick={onOpenSettings}>
          {RATINGS_COPY.settings}
        </button>
      </div>
    </div>
  );
}
