/** The heading of a card block: a title and, when the block has one, the line under it. */
export function CardHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="hw-card__head">
      <div className="hw-card__title">{title}</div>
      {sub !== undefined && <div className="hw-card__sub">{sub}</div>}
    </div>
  );
}
