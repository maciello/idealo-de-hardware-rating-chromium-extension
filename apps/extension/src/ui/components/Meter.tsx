const SEGMENTS = [0, 1, 2, 3, 4] as const;

/** Five-segment percentile meter. With a `label` it is an image for assistive tech, else decorative. */
export function Meter({
  filled,
  label,
  testId,
}: {
  filled: number;
  label?: string;
  testId?: string;
}) {
  return (
    <span
      className="hw-meter"
      data-filled={filled}
      {...(testId ? { "data-testid": testId } : {})}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {SEGMENTS.map((i) => (
        <i key={i} {...(i < filled ? { "data-on": "" } : {})} />
      ))}
    </span>
  );
}
