const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const parse = (iso: string | null | undefined): number | null => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

/** `14.10.2026`; null for a missing or unparsable timestamp. */
export function formatImportDate(iso: string | null): string | null {
  const time = parse(iso);
  return time === null ? null : DATE.format(new Date(time));
}

/** Date and time in the browser's own locale (not pinned to de-DE). */
export const formatLocalDateTime = (iso: string): string => new Date(iso).toLocaleString();

/** `14.10.` without the year; null for a missing or unparsable timestamp. */
export function formatShortDate(iso: string | null | undefined): string | null {
  const time = parse(iso);
  return time === null ? null : SHORT_DATE.format(new Date(time));
}
